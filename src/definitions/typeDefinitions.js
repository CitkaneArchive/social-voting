/**
 * The uid of the entity making the api call.
 *
 * This should be passed in from the previous service call and originates in the frontend/bff service.
 *
 * It can be overridden at the api interface level.
 * @typedef  {String} ownerId
 *
*/

/**
 * The path identifier for an api call.
 *
 * Must be of the format: **shortname_of_the_service**.**function_to_call**.
 * @typedef {String}  apiPath
 *
 * @example 'accounts.contract'
 */

/**
 * The function identifier for a request.
 *
 * Must be of the format: **crud_operation**.**function_to_call**.
 * @typedef {String}  reqPath
 *
 * @example 'create.contract'
 */

/**
  * The unique shortname of the microservice. Consult the 'config' files at module root.
  * @typedef {String} serviceShortname
  */


module.exports = {
    /**
     * @typedef request
     * @property {ownerId} ownerId - The uid of the entity which made the api call;
     * @property {String} action - The CRUD action to be called;
     * @property {String} command - The corresponding command invocation for the CRUD operation;
     * @property {(String|Object[])} args - The arguments to pass to the command.
     * @example
     * {
     *  action: 'create',
     *  command: 'user',
     *  args: ['arg1', {...}, [...]],
     *  ownerId: 'uid12345'
     * }
     */
    request: (ownerId, action, command, args = []) => {
        let thisArgs = args;
        if (!Array.isArray(thisArgs)) thisArgs = [thisArgs];
        return {
            ownerId,
            action,
            command,
            args: thisArgs
        };
    },

    /**
     * @typedef response
     * @property {Number} status - The response code as to HTTP schema.
     * @property {any} payload - The api response payload.
     * @example
     * {
     *  status: 200,
     *  payload: {...}
     * }
     */
    response: (status, payload) => ({
        status,
        payload
    }),
    /**
     * @typedef response-error
     * @property {Number} status - The response code as to HTTP schema.
     * @property {any} message - The api response error.
     * @example
     * {
     *  status: 404,
     *  message: 'not found'
     * }
     */
    error: (status, message) => ({
        status,
        message
    })
};
