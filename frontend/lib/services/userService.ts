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
        const user = await this.getUser(userId);
        if (!user) {
            // If user doesn't exist in public table (sync lag?), assume free limit or fail.
            // For now, fail safe.
            return { allowed: false, error: 'User not found' };
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
