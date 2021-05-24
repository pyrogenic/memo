import IMemo from "./IMemo";
import IMemoOptions from "./IMemoOptions";
import StorageMemo from "./StorageMemo";

type FetchMemo = IMemo<[
    input: RequestInfo,
    init?: RequestInit,
], Response>;

type Unwrap<T> = T extends Promise<infer Q> ? Q :
    T extends (() => Promise<infer Q>) ? Q : T;

type SerializedResponse = {
    json: object,
    url: string,
    type: Response["type"],
};

const CACHEABLE_CONTENT_TYPES = [
    "application/json",
];

export default class MemoizedFetch {
    memo: FetchMemo;

    validate(response: Response) {
        if (!response.ok) {
            return false;
        }
        const contentType = response.headers.get("content-type");
        return CACHEABLE_CONTENT_TYPES.includes(contentType ?? "");
    }

    async prepare(response: Response): Promise<SerializedResponse> {
        let json: any;
        if (response.headers.get("content-type") === "application/json") {
            json = await response.json();
            response.json = () => Promise.resolve(json);
        } else {
            json = await response.text();
            response.text = () => Promise.resolve(json);
        }
        return { json, type: response.type, url: response.url };
    };

    hydrate(data: SerializedResponse): Response {
        const { json, type, url } = data;
        const result: Response = {
            ...data,
            text: () => Promise.resolve(typeof json === "string" ? json : JSON.stringify(json)),
            json: () => Promise.resolve(json),
            ok: true,
            status: 200,
            statusText: "OK",
            arrayBuffer: () => { throw new Error("Not implemented."); },
            blob: () => result.arrayBuffer().then((ab) => new Blob([ab])),
            headers: new Headers([["content-type", "application/json"]]),
            body: undefined as any,
            bodyUsed: true,
            clone: () => result,
            redirected: false,
            trailer: Promise.resolve(new Headers()),
            type: "default",
            formData: () => Promise.resolve(new FormData()),
        };
        return result;
    };

    constructor(memoType: "local" | "session" | FetchMemo) {
        switch (memoType) {
            case "local":
                memoType = new StorageMemo(window.localStorage, "fetch", {
                    factory: (props) => fetch(...props),
                    validate: this.validate,
                    prepare: this.prepare,
                    hydrate: this.hydrate,
                });
                break;
            case "session":
                memoType = new StorageMemo(window.sessionStorage, "fetch", {
                    factory: (props) => fetch(...props),
                    prepare: this.prepare,
                    hydrate: this.hydrate,
                });
                break;
        }
        this.memo = memoType;
    }

    public fetch = async (input: RequestInfo, init?: RequestInit, options?: IMemoOptions): Promise<Response> => {
        return this.memo.get([input, init], options);
    }
}
