export default interface IMemoFactoryOptions<TProps, TResult, TSerialized = {}> {
    factory: (props: TProps) => Promise<TResult>;
    validate?: (result: TResult) => boolean;
    prepare?: (result: TResult) => Promise<TSerialized>;
    hydrate?: (data: TSerialized) => TResult;
}
