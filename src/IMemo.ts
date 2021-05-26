import IMemoOptions from "./IMemoOptions";

export default interface IMemo<TRequest, TResponse> {
    defaultOptions: Required<IMemoOptions>;
    get(props: TRequest, options?: IMemoOptions): Promise<TResponse>;
}
