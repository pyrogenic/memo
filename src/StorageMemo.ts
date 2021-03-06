import IMemo from "./IMemo";
import IMemoFactoryOptions from "./IMemoFactoryOptions";
import IMemoOptions from "./IMemoOptions";

export default class StorageMemo<TProps, TResult, TSerialized = {}> implements
    IMemo<TProps, TResult>,
    Readonly<IMemoFactoryOptions<TProps, TResult, TSerialized>> {

    public defaultOptions: Required<IMemoOptions> = {
        bypass: false,
        cache: true,
        log: false,
    };

    public readonly storage: Storage;
    public readonly name: string;
    public readonly factory: IMemoFactoryOptions<TProps, TResult, TSerialized>["factory"];
    public readonly validate: IMemoFactoryOptions<TProps, TResult, TSerialized>["validate"];
    public readonly prepare: IMemoFactoryOptions<TProps, TResult, TSerialized>["prepare"];
    public readonly hydrate: IMemoFactoryOptions<TProps, TResult, TSerialized>["hydrate"];

    constructor(storage: Storage, name: string, options: IMemoFactoryOptions<TProps, TResult, TSerialized>) {
        this.storage = storage;
        this.name = name;
        this.factory = options.factory;
        this.validate = options.validate;
        this.prepare = options.prepare;
        this.hydrate = options.hydrate;
    }

    public get = async (props: TProps, { cache, bypass, log }: IMemoOptions = {}) => {
        if (cache === undefined) { cache = this.defaultOptions.cache; }
        if (bypass === undefined) { bypass = this.defaultOptions.bypass; }
        if (log === undefined) { log = this.defaultOptions.log; }
        const key = `${this.name}/${JSON.stringify(props)}`;
        if (log) { console.log({ props, cache, bypass, log }); }
        const cachedValue = !bypass && this.storage.getItem(key);
        if (cachedValue) {
            const json = JSON.parse(cachedValue) as TSerialized;
            const parse = this.hydrate ? this.hydrate(json) : json as unknown as TResult;
            const valid = this.validate?.(parse) ?? "no validate func";
            if (log) { console.log({ props, cachedValue, json, parse, valid }); }
            if (valid) {
                return parse;
            }
        }
        const newValue = await this.factory(props);
        if (cache) {
            const valid = this.validate?.(newValue) ?? "no validate func";
            if (log) { console.log({ props, newValue, valid }); }
            if (valid) {
                const json = this.prepare ? await this.prepare(newValue) : newValue as unknown as TSerialized;
                this.storage.setItem(key, JSON.stringify(json));
            }
        }
        return newValue;
    }
}
