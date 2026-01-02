export const mergeResults = (results) => {
    for (const result of results) {
        if (result.status === "error") {
            return result;
        }
    }
    // @ts-ignore
    return { status: "success", result: results.map((result) => result.result) };
};
//# sourceMappingURL=result.js.map