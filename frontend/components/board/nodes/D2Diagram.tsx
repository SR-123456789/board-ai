import React, { useEffect, useState, useRef } from 'react';

interface D2DiagramProps {
    code: string;
    onFix?: (fixedCode: string) => void;
}

export const D2Diagram: React.FC<D2DiagramProps> = ({ code, onFix }) => {
    const [svg, setSvg] = useState<string>('');
    const [displayCode, setDisplayCode] = useState<string>(code);
    const [retryCount, setRetryCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastErrorText, setLastErrorText] = useState<string | null>(null);
    const [isStuck, setIsStuck] = useState<boolean>(false);
    
    const activeRequestIdRef = useRef<number>(0);

    // Reset when base code changes from external source (e.g. AI streaming)
    // Only reset if the new code is actually different from our current displayCode
    useEffect(() => {
        if (code !== displayCode) {
            setDisplayCode(code);
            setRetryCount(0);
            setIsStuck(false);
            setNeedsPersistence(false);
        }
    }, [code]);

    // Track if the current displayCode is a result of a successful fix that needs to be saved
    const [needsPersistence, setNeedsPersistence] = useState(false);

    useEffect(() => {
        const requestId = ++activeRequestIdRef.current;
        const abortController = new AbortController();

        const renderDiagram = async () => {
            if (!displayCode.trim()) return;
            if (isStuck) return;

            setIsLoading(true);
            setLastErrorText(null);

            try {
                const response = await fetch('/api/d2/render', {
                    method: 'POST',
                    body: displayCode,
                    signal: abortController.signal
                });

                if (requestId !== activeRequestIdRef.current) return;

                if (!response.ok) {
                    const errorText = await response.text();
                    if (requestId !== activeRequestIdRef.current) return;
                    
                    setLastErrorText(errorText);

                    // Attempt auto-fix ONLY if it's a 400 (Syntax Error) and retry count allows
                    if (response.status === 400 && retryCount < 2) {
                        const fixResponse = await fetch('/api/d2/fix', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: displayCode, error: errorText }),
                            signal: abortController.signal
                        });

                        if (requestId !== activeRequestIdRef.current) return;

                        if (fixResponse.ok) {
                            const { fixedCode } = await fixResponse.json();
                            if (requestId !== activeRequestIdRef.current) return;
                            
                            // More robust cleanup for fixed code
                            const cleanedFixed = fixedCode
                                .replace(/^```[a-z]*\n/i, '') // Remove opening ```lang
                                .replace(/\n```$/i, '')       // Remove closing ```
                                .trim();

                            // Prevent fixing to the same code which would loop
                            if (cleanedFixed === displayCode) {
                                setIsStuck(true);
                                setLastErrorText("AI returned the same invalid code. Stopping fix attempts.");
                                return;
                            }

                            setRetryCount(prev => prev + 1);
                            setDisplayCode(cleanedFixed);
                            setNeedsPersistence(true); // Plan to save if THIS code works
                            return; 
                        }
                    }
                    
                    setIsStuck(true);
                    throw new Error(errorText || `D2 API error: ${response.statusText}`);
                }

                const svgText = await response.text();
                if (requestId !== activeRequestIdRef.current) return;

                setSvg(svgText);
                setIsStuck(false);

                // PERSISTENCE: Only save if we just successfully rendered a fixed version
                if (needsPersistence) {
                    onFix?.(displayCode);
                    setNeedsPersistence(false);
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error('D2 render error:', err);
                if (requestId === activeRequestIdRef.current) {
                    setLastErrorText(err.message || 'Failed to render D2 diagram');
                    setIsStuck(true);
                }
            } finally {
                if (requestId === activeRequestIdRef.current) {
                    setIsLoading(false);
                }
            }
        };

        // Small debounce to avoid spamming during streaming
        const timeout = setTimeout(renderDiagram, 300);
        
        return () => {
            clearTimeout(timeout);
            abortController.abort();
        };
    }, [displayCode, retryCount, isStuck]);

    if (isStuck && lastErrorText) {
        return (
            <div className="my-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800 w-full">
                <div className="font-semibold mb-1 text-xs uppercase tracking-wider">D2 Rendering Error {retryCount > 0 && `(Failed after ${retryCount} fixes)`}</div>
                <div className="opacity-80 mb-2 font-mono text-xs">{lastErrorText}</div>
                <div className="text-[10px] uppercase font-bold mt-3 mb-1 opacity-50">Current Code:</div>
                <pre className="text-xs bg-black/5 dark:bg-black/20 p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap border border-black/5 dark:border-white/5">
                    {displayCode}
                </pre>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="my-4 p-8 flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 animate-pulse w-full">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs text-neutral-500">
                    {retryCount > 0 ? `AI is fixing syntax (Attempt ${retryCount}/2)...` : 'Rendering D2 diagram...'}
                </span>
            </div>
        );
    }

    return (
        <div 
            className="my-4 flex flex-col items-center overflow-x-auto bg-white dark:bg-transparent rounded-lg p-4 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors w-full"
        >
            <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full flex justify-center" />
            {retryCount > 0 && (
                <div className="mt-2 text-[10px] text-neutral-400 italic">
                    Successfully auto-fixed by AI ({retryCount} {retryCount === 1 ? 'attempt' : 'attempts'})
                </div>
            )}
        </div>
    );
};
