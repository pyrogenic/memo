import IMemoOptions from "./IMemoOptions";

export default interface IMemo<TRequest, TResponse> {
    get(props: TRequest, options?: IMemoOptions): Promise<TResponse>;
}
