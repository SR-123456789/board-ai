import prisma from '@/lib/prisma';
import { PlanConfig, User } from '@prisma/client';

export class UserService {
    static async getUser(userId: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id: userId },
        });
    }

    static async getPlanConfig(plan: string): Promise<PlanConfig | null> {
        return prisma.planConfig.findUnique({
            where: { plan },
        });
    }

    static async canConsumeTokens(userId: string, requestedAmount: number = 0): Promise<{ allowed: boolean; remaining?: number; error?: string }> {
        let user = await this.getUser(userId);
        if (!user) {
            return { allowed: false, error: 'User not found' };
        }

        // Lazy Monthly Reset Logic
        const now = new Date();
        // Handle case where lastResetDate might be missing or invalid
        let lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date(0);
        
        // Check if date is valid
        if (isNaN(lastReset.getTime())) {
            console.log(`[UserService] Invalid lastResetDate detected for user ${userId}, treating as never reset.`);
            lastReset = new Date(0); // Force reset
        }

        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            console.log(`[UserService] Resetting token usage for user ${userId} (Last reset: ${lastReset.toISOString()})`);
            
            // Reset in DB
            user = await prisma.user.update({
                where: { id: userId },
                data: {
                    tokenUsage: 0,
                    lastResetDate: now
                }
            });
        }

        const planConfig = await this.getPlanConfig(user.plan);
        if (!planConfig) {
            return { allowed: false, error: 'Invalid plan' };
        }

        if (planConfig.monthlyLimit === -1) {
            return { allowed: true };
        }

        const remaining = planConfig.monthlyLimit - user.tokenUsage;
        if (remaining < requestedAmount) {
            return { allowed: false, remaining, error: 'Monthly token limit exceeded' };
        }

        return { allowed: true, remaining };
    }

    static async consumTokens(userId: string, amount: number) {
        const { allowed, error } = await this.canConsumeTokens(userId, amount);
        if (!allowed) throw new Error(error);

        await prisma.user.update({
            where: { id: userId },
            data: {
                tokenUsage: {
                    increment: amount,
                },
            },
        });
    }
}
