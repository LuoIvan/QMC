var request = require("request");
request = request.defaults({
    jar: true, forever: true, headers: {
        'connection': 'keep-alive'
    }
});//enable cookie

/**
 * @class GerritUtil
 * @classdesc the Gerrit Util
 */
class GerritUtil {
    /**
     * @method
     * @param {string} jsonStr - json string return from gerrit response
     * @returns {Object} the object
     */
    static parseJson(jsonStr) {
        return JSON.parse(jsonStr.substr(5))
    }

    /**
     * @method
     * @param {string} userCookie - the user's cookie
     * @param {function(Object)} callback
     * @desc get the user's gerrit info by his gerrit cookie
     */
    static getUserInfo(userCookie, callback) {
        let j = request.jar();
        let cookie = request.cookie(userCookie);
        let url = "https://gerrit-gfx.intel.com/accounts/self";
        j.setCookie(cookie, url);
        request.get({
            url: url,
            jar: j,
            forever: true
        }, function (err, resp, body) {
            if (err)//network connection error
                callback(undefined);
            else {
                try {//vaild cookie
                    callback(GerritUtil.parseJson(body));
                } catch (e) {//wrong cookie
                    callback(null);
                }
            }
        });
    }

    /**
     * @method
     * @param {string} userCookie - the user's cookie
     * @param {string} startDay -
     * @param {string} endDay -
     * @param {function(Object)} callback
     * @desc get all merged list from gerrit
     */
    static getAllMergedList(userCookie, startDay, endDay, callback) {
        let j = request.jar();
        let cookie = request.cookie(userCookie);
        let url = `https://gerrit-gfx.intel.com/changes/?q=status:merged+project:gfx/products/gfx-driver+branch:comp/media+after:"${startDay}"+before:"${endDay}"`;
        j.setCookie(cookie, url);
        request.get({
            url: url,
            jar: j,
            forever: true
        }, function (err, resp, body) {
            let list = GerritUtil.parseJson(body);
            callback(list.length === 0 ? null : list);//return null if cookie is wrong

        });
    }

    /**
     * @method
     * @param {string} userCookie - the user's cookie
     * @param {number} changeId
     * @param {function(Object)} callback
     * @desc get the change detail from change id
     */
    static getChangeDetail(userCookie, changeId, callback) {
        let j = request.jar();
        let cookie = request.cookie(userCookie);
        let url = "https://gerrit-gfx.intel.com/a/changes/" + changeId + "/detail/?o=ALL_REVISIONS&o=ALL_FILES";
        j.setCookie(cookie, url);
        request.get({
            url: url,
            jar: j,
            forever: true
        }, function (err, resp, body) {
            try {
                callback(GerritUtil.parseJson(body))

            } catch (e) {
                callback(null);
            }
        });
    }

    /**
     * @method
     * @param {string} userCookie - the user's cookie
     * @param {string} dayStart -
     * @param {string} dayEnd -
     * @param {function(Object)} callback
     * @desc get the user's code-review history by his cookie
     */
    static getHistory(userCookie, dayStart, dayEnd, callback) {
        let j = request.jar();
        let cookie = request.cookie(userCookie);
        let url = `https://gerrit-gfx.intel.com/a/changes/?q=NOT label:Code-Review=0,user=self+status:merged+after:"${dayStart}"+before:"${dayEnd}"&o=DETAILED_LABELS`;
        j.setCookie(cookie, url);
        request.get({
            url: url,
            jar: j,
            forever: true
        }, function (err, resp, body) {
            try {//cookie is correct
                callback(GerritUtil.parseJson(body))
            } catch (e) {//cookie is wrong
                callback(null);
            }
        });
    }

    /**
     * @method
     * @param {array<number>} changeIds - the array change id
     * @param {function(Object)} callback
     * @desc change details by given change ids, only pass the valid ones and remove duplicates
     */
    static getChanges(changeIds, callback) {
        let changeIds_ = Array.from(new Set(changeIds));//remove duplicates
        let count = 0;
        let changes = [];
        changeIds_.forEach(async (changeId) => {
            GerritUtil.getChangeDetail("GerritAccount=aTOefeP4ehLabdWxvZHn3ycLv6I02mlZ", changeId, function (change) {
                if (change) {//only valid ones
                    let reviews = [];
                    change['labels']['Code-Review']['all'].forEach(review => {
                        if (review['value'] !== 0) {
                            reviews.push({value: review.value, userId: review._account_id})
                        }
                    });
                    if (reviews.length > 0)
                        changes.push({changeId: changeId, reviews: reviews});
                }
                count++;
                if (count === changeIds_.length)
                    callback(changes)

            })
        })
    }

    /**
     * @method
     * @param {number} timeBefore - time before in seconds
     * @param {function(array)} callback - pass the recent changes
     * @desc fetch recent changes on gerrit  {timeBefore} seconds ago
     */
    static fetchRecent(timeBefore, callback) {
        let now = new Date();
        now.setSeconds(now.getSeconds() - timeBefore);
        let startTimeStr = now.toISOString().slice(0, -1).replace('T', ' ');
        let j = request.jar();
        let cookie = request.cookie("GerritAccount=aTOefeP4ehLabdWxvZHn3ycLv6I02mlZ");
        let url = `https://gerrit-gfx.intel.com/a/changes/?q=status:merged+project:gfx/products/gfx-driver+branch:comp/media+after:"${startTimeStr}"&o=DETAILED_LABELS`;
        j.setCookie(cookie, url);
        request.get({
            url: url,
            jar: j,
            forever: true
        }, function (err, resp, body) {
            let bodyList = GerritUtil.parseJson(body);

            let changes = [];
            bodyList.forEach(change => {
                let changeId = change._number;
                let reviews = [];
                change['labels']['Code-Review']['all'].forEach(review => {
                    if (review['value'] !== 0) {
                        reviews.push({value: review.value, userId: review._account_id})
                    }
                });
                if (reviews.length > 0)
                    changes.push({changeId: changeId, reviews: reviews})
            });
            callback(changes);
        });
    }

    /**
     *
     * @param {string} commitHash - the sha1 commit hash of git commit
     */
    static getChangeByCommitHash(commitHash) {
        let j = request.jar();
        let cookie = request.cookie("GerritAccount=aTOefeP4ehLabdWxvZHn3ycLv6I02mlZ");
        let url = `https://gerrit-gfx.intel.com/a/changes/?q=commit:${commitHash}&o=DETAILED_LABELS`;
        j.setCookie(cookie, url);
        return new Promise(function (resolve, reject) {
            request.get({
                url: url,
                jar: j,
                forever: true
            }, function (err, resp, body) {
                try {
                    resolve(GerritUtil.parseJson(body))
                } catch (e) {
                    reject(e);
                }
            });
        });

    }
}


module.exports = GerritUtil;
