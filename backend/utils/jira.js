var request = require("request");
const json2csv = require('json2csv').parse;
const fields = ['id', 'title', 'type', 'reported', 'created', 'updated', 'status', 'description', 'priority', 'security', 'valid', 'invalid_reason'];
const opts = {fields};
var qcoinConfig = require('../qcoinConfig');

request = request.defaults({
    strictSSL: false,
    jar: true,
    forever: true,
    headers: {
        'connection': 'keep-alive'
    }
});//enable cookie

/**
 * @class JiraUtil
 */
class JiraUtil {
    static get VALID() {
        return 0;
    }

    static get INVALID_REGRESSION() {
        return 1;
    }

    static get INVALID_REGRESSION_COMMIT_ID() {
        return 2;
    }

    static get INVALID_ROOT_CAUSE() {
        return 4;
    }

    static get INVALID_FIX_COMMIT_ID() {
        return 8;
    }

    static get INVALID_REJECTED_REASON() {
        return 16;
    }

    static getValidity(validNum) {
        if (validNum === 0)
            return {validity: ['VALID'], sum: 0};
        let o = {validity: [], sum: validNum};
        if ((validNum & 1) === 1)
            o.validity.push("INVALID_REGRESSION");

        if ((validNum & 2) === 2)
            o.validity.push("INVALID_REGRESSION_COMMIT_ID");

        if ((validNum & 4) === 4)
            o.validity.push("INVALID_ROOT_CAUSE");

        if ((validNum & 8) === 8)
            o.validity.push("INVALID_FIX_COMMIT_ID");

        if ((validNum & 16) === 16)
            o.validity.push("INVALID_REJECTED_REASON");

        return o;
    }

    /**
     * @method
     * @param {number} dayStart -
     * @param {number} dayEnd -
     * @param {boolean} isCsv -
     * @param {function(Object)} callback - callback function
     * @description fetch recent {timeDeltaMinute} minute bugs on jira
     */
    static getRecent(dayStart, dayEnd, isCsv = false, callback) {
        let url = `https://jira01.devtools.intel.com/rest/api/2/search?jql=project=VSMGWL AND (type=bug OR type=sub-task OR type=task) AND updated >= -${dayStart}d AND updated <= -${dayEnd}d order by updated DESC&maxResults=1000`;
        console.log(qcoinConfig.username, qcoinConfig.password)
        request.get(url,
            function (err, resp, body) {
                console.log(body)

                let results = JSON.parse(body).issues;
                let outputs = [];
                results.forEach(result => {
                    let fields = result.fields;
                    Object.keys(fields).forEach(key => {
                        if (key.startsWith("customfield_"))
                            delete fields[key]
                    });
                    outputs.push({
                        id: result.key,
                        title: fields['summary'],
                        type: fields['issuetype']['name'],
                        reporter: fields['reporter']['name'],
                        created: fields['created'],
                        updated: fields['updated'],
                        status: fields['status']['name'],
                        description: fields['description'],
                        priority: fields['priority']['name'],
                        security: fields['security'] ? fields['security']['name'] : null
                    })
                });
                if (isCsv)
                    callback(json2csv(outputs, opts));
                else
                    callback(outputs)
            }).auth(qcoinConfig.username, qcoinConfig.password)
    }

    /**
     * checkOpen
     * @param {string} description
     * @returns {number}
     */
    static checkOpen(description) {
        return (/\[regression]/g.test(description) ? 0 : this.INVALID_REGRESSION) |
            (/\[Culprit](\S|\s)*CL(\S|\s)*[0-9]+/g.test(description) ? 0 : this.INVALID_REGRESSION_COMMIT_ID)
    }

    /**
     * checkImplemented
     * @param {string} description
     * @returns {number}
     */
    static checkImplemented(description) {
        return this.checkOpen(description) |
            (/\[Root Cause](\S|\s)*/g.test(description) ? 0 : this.INVALID_ROOT_CAUSE)
    }

    /**
     * checkClosed
     * @param {string} description
     * @returns {number}
     */
    static checkClosed(description) {
        return this.checkImplemented(description) |
            (/\[Fixed CL](\S|\s)*CL(\S|\s)*[0-9]+/g.test(description) ? 0 : this.INVALID_FIX_COMMIT_ID)
    }

    /**
     * checkRejected
     * @param {string} description
     * @returns {number}
     */
    static checkRejected(description) {
        return this.checkOpen(description) |
            (/\[Rejected Reason](\S|\s)*/g.test(description) ? 0 : this.INVALID_REJECTED_REASON)
    }
}

console.log(JiraUtil.checkOpen("[regression] and \n[Culprit] CL 12345"))
module.exports = JiraUtil;
