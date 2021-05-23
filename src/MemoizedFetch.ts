import IMemo from "./IMemo";
import IMemoOptions from "./IMemoOptions";
import StorageMemo from "./StorageMemo";

type FetchMemo = IMemo<[
    input: RequestInfo,
    init?: RequestInit,
], Response>;

export default class MemoizedFetch {
    memo: FetchMemo;
    constructor(memoType: "local" | "session" | FetchMemo) {
        switch (memoType) {
            case "local":
                memoType = new StorageMemo(window.localStorage, "fetch", (props) => fetch(...props));
                break;
            case "session":
                memoType = new StorageMemo(window.sessionStorage, "fetch", (props) => fetch(...props));
                break;
        }
        this.memo = memoType;
    }

    public fetch = (input: RequestInfo, init?: RequestInit, options?: IMemoOptions) => {
        return this.memo.get([input, init], options);
    }
}
