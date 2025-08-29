export const isSubscribed = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user || user.subscription.status !== 'active') {
        return res.status(403).json({ error: 'You do not have an active subscription.' });
    }
    next();
};