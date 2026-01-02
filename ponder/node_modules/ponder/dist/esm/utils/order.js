export const orderObject = (obj) => {
    if (Array.isArray(obj))
        return obj.map((x) => orderObject(x));
    if (typeof obj !== "object")
        return obj;
    const newObj = {};
    for (const key of Object.keys(obj).sort()) {
        const val = obj[key];
        if (typeof val === "object") {
            newObj[key] = orderObject(obj[key]);
        }
        else {
            newObj[key] = obj[key];
        }
    }
    return newObj;
};
//# sourceMappingURL=order.js.map