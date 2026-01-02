export const estimate = ({ from, to, target, result, min, max, prev, maxIncrease, }) => {
    const density = (to - from) / (result || 1);
    // min <= estimate <= prev * maxIncrease or max
    return Math.min(Math.max(min, Math.round(target * density)), Math.round(prev * maxIncrease), max);
};
//# sourceMappingURL=estimate.js.map