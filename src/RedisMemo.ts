import IMemo from "./IMemo";
import IMemoFactoryOptions from "./IMemoFactoryOptions";
import IMemoOptions from "./IMemoOptions";

interface IRedisMemoProps<TProps, TResult, TSerialized> extends IMemoFactoryOptions<TProps, TResult, TSerialized> {
    webdis: string;
    /**
     * scheme to turn props into a redis key name
     */
    name: (props: TProps) => string[];
    factory: (props: TProps) => Promise<TResult>;
    validate?: (result: TResult) => boolean;
}

/**
 * Memoization backed by {@link https://github.com/nicolasff/webdis | Webdis}.
 */
export default class RedisMemo<TProps, TResult, TSerialized = {}> implements IMemo<TProps, TResult> {
    defaultOptions: IMemoOptions = { bypass: false, cache: true };

    public readonly webdis: string;
    public readonly name: (props: TProps) => string[];
    public readonly factory: (props: TProps) => Promise<TResult>;
    public readonly validate?: (result: TResult) => boolean;
    public readonly hydrate: ((data: TSerialized) => TResult) | undefined;
    public readonly prepare: ((result: TResult) => Promise<TSerialized>) | undefined;

    constructor({ webdis, name, factory, validate, hydrate, prepare }: IRedisMemoProps<TProps, TResult, TSerialized>) {
        this.webdis = webdis;
        this.name = name;
        this.factory = factory;
        this.validate = validate;
        this.hydrate = hydrate;
        this.prepare = prepare;
    }

    public get = async (props: TProps, { cache, bypass }: IMemoOptions = {}) => {
        if (cache === undefined) { cache = true; }
        if (bypass === undefined) { bypass = false; }
        const key = this.key(props);
        if (!bypass) {
            const url = `${this.webdis}/GET/${key}.txt`;
            const { cachedValue, success } = await this.go(url);
            if (success) {
                const json = JSON.parse(cachedValue) as TSerialized;
                const parse = this.hydrate ? this.hydrate(json) : json as unknown as TResult;
                const valid = this.validate?.(parse) ?? "no validate func";
                if (valid) {
                    return parse;
                }
            }
        }
        const newValue = await this.factory(props);
        if (cache) {
            const valid = this.validate?.(newValue) ?? "no validate func";
            if (valid) {
                await this.cacheInternal(props, newValue, key);
            }
        }
        return newValue;
    }

    private cacheInternal = async (props: TProps, value: TResult, key?: string) => {
        key = key ?? this.key(props);
        const json = this.prepare ? await this.prepare(value) : value as unknown as TSerialized;
        const stringValue = JSON.stringify(json);
        await fetch(`${this.webdis}/SET/${key}`, {
            body: stringValue,
            headers: {
                "Content-Type": "text/plain",
            },
            method: "PUT",
        });
    }

    public cache: (props: TProps, value: TResult) => Promise<void> = this.cacheInternal;

    public has = async (props: TProps) => {
        const key = this.key(props);
        const { EXISTS: exists } = await (await fetch(`${this.webdis}/EXISTS/${key}`)).json();
        return exists === 1;
    }

    private key(props: TProps) {
        return this.name(props).map(encodeURIComponent.bind(null)).join(":");
    }

    private go(url: string): Promise<{ success: boolean, cachedValue: string; }> {
        const catchError = (error: Error) => {
            return { cachedValue: error.message, success: false };
        };
        return fetch(url).then(
            (response) => {
                const { ok: success } = response;
                return response.text()
                    .then(
                        (cachedValue: string) => ({ cachedValue, success }),
                        catchError);
            },
            catchError);
    }
}
