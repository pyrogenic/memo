export default interface IMemoOptions {
    /** memoize value new values */
    cache?: boolean;

    /** ignore memoized value, if any */
    bypass?: boolean;

    /** log activity to the console */
    log?: boolean;
}
