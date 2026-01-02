/** Waits at least a specified amount of time.
 *
 * @param milliseconds Minimum number of milliseconds to wait.
 */
export async function wait(milliseconds) {
    if (process.env.NODE_ENV === "ci")
        return;
    return new Promise((res) => setTimeout(res, milliseconds));
}
//# sourceMappingURL=wait.js.map