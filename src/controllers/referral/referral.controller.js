/**
 * Written by Pradeep
 */
import { catchAsync } from "../../middlewares/errorHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Referral from "../../models/referral/referral.model.js";
import User from "../../models/user/user.model.js";

// GET /referrals/my — List of people I referred
export const getMyReferrals = catchAsync(async (req, res) => {
    const referrerId = req.user.id;

    const referrals = await Referral.find({ referrerId })
        .populate({ path: "refereeId", select: "firstName lastName email createdAt" })
        .sort({ createdAt: -1 })
        .lean();

    res.status(200).json(
        new ApiResponse(200, { referrals }, "Referrals fetched successfully")
    );
});

// GET /referrals/stats — My referral code + stats
export const getReferralStats = catchAsync(async (req, res) => {
    const userId = req.user.id;

    const [user, totalReferrals, completedReferrals] = await Promise.all([
        User.findById(userId).select("referralCode").lean(),
        Referral.countDocuments({ referrerId: userId }),
        Referral.countDocuments({ referrerId: userId, status: "COMPLETED" }),
    ]);

    // Total earned = completed referrals × referrer reward (100)
    const totalEarned = completedReferrals * 100;

    res.status(200).json(
        new ApiResponse(200, {
            referralCode: user?.referralCode || null,
            totalReferrals,
            completedReferrals,
            pendingReferrals: totalReferrals - completedReferrals,
            totalEarned,
        }, "Referral stats fetched successfully")
    );
});
