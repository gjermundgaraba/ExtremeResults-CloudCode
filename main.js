/* Cloud Code for Xtreme Results Apps */

var moment = require('cloud/moment');


/*
 * WARNING!!! THIS SHOULD NOT BE IN PRODUCTION
 * Clear the database. Used ONLY for e2e tests. Should NEVER be deployed to production environment.
 */
Parse.Cloud.define("clearDB", function(request, response) {
    var entries = [];

    var outcomesQuery = new Parse.Query("Outcome");
    var reflectionsQuery = new Parse.Query("Reflection");

    var promises = [];
    promises.push(deleteOutcomes());
    promises.push(deleteReflections());

    Parse.Promise
        .when(promises)
        .then(function () {
            response.success(entries);
        }, function (error) {
            response.error(error);
        });

    function deleteOutcomes() {
        return outcomesQuery.find()
            .then(function(outcomes) {
                return Parse.Object.destroyAll(outcomes);
            });
    }

    function deleteReflections() {
        return reflectionsQuery.find()
            .then(function(reflections) {
                return Parse.Object.destroyAll(reflections);
            });
    }

});


/*
 * Function to get all Agile Results type entries (Daily Outcomes, Monday Visions, Weekly Reflections, etc...)
 *
 * Returns an array sorted by effectiveDate
 */
Parse.Cloud.define("getEntries", function(request, response) {
    var entries = [];

    var outcomesQuery = new Parse.Query("Outcome");
    var reflectionsQuery = new Parse.Query("Reflection");

    outcomesQuery.find()
        .then(function(outcomes) {
            entries.push.apply(entries, outcomes);

            return reflectionsQuery.find();        })
        .then(function(reflections) {
            entries.push.apply(entries, reflections);

            entries.sort(entriesSortFunction);
            response.success(entries);
        }, function (error) {
            response.error(error);
        });

    function entriesSortFunction(a, b) {
        var dateA = new Date(a.get("effectiveDate"));
        var dateB = new Date(b.get("effectiveDate"));

        if (dateA > dateB) {
            return -1;
        } else if (dateA < dateB) {
            return 1;
        } else {
            return 0;
        }
    }

});

/*
 * Function to get all current active outcomes
 *
 * Eg: Today's outcomes, this weeks outcomes etc.
 *
 * Returns an array with current active outcomes
 */
Parse.Cloud.define("getActiveEntries", function(request, response) {
    var entries = [];

    // Daily
    var dailyOutcomeQuery = new Parse.Query("Outcome");
    dailyOutcomeQuery.equalTo("typeName", "Daily");

    var startDateForDaily = moment().startOf("day").toDate();
    dailyOutcomeQuery.greaterThanOrEqualTo("effectiveDate", startDateForDaily);

    var finishDateForDaily = moment().endOf("day").toDate();
    dailyOutcomeQuery.lessThan("effectiveDate", finishDateForDaily);


    // Weekly
    var weeklyOutcomeQuery = getWeeklyOutcomeQuery();

    dailyOutcomeQuery.first()
        .then(function (dailyOutcome) {
            if (typeof dailyOutcome !== "undefined") {
                entries.push(dailyOutcome);
            }

            return weeklyOutcomeQuery.first();
        })
        .then(function (weeklyOutcome) {
            if (typeof weeklyOutcome !== "undefined") {
                entries.push(weeklyOutcome);
            }

            response.success(entries);
        }, function (error) {
            response.error(error);
        });

});

/*
 * Function to get all related entries for an outcome
 *
 * Monday Vision:
 * Last Friday Reflection (if there is any).
 *
 * Daily Outcome:
 * Monday Vision (if there is any)
 *
 *
 * Input:
 * typeName: outcome typeName (eg. Daily, Weekly)
 * outcomeDate: optional,
 */
Parse.Cloud.define("getRelatedEntriesForOutcome", function(request, response) {
    var entries = [];

    var typeName = request.params.typeName;
    var momentDate = (typeof request.params.outcomeDate === "undefined") ? moment() : moment(request.params.outcomeDate);

    if (typeName === "Daily") {
        var weeklyOutcomeQuery = getWeeklyOutcomeQuery(momentDate);

        weeklyOutcomeQuery.first()
            .then(function (weeklyOutcome) {
                if (typeof weeklyOutcome !== "undefined") {
                    entries.push(weeklyOutcome);
                }

                var lastDailyOutcomeQuery = getDailyOutcomeQuery(momentDate.clone().subtract(1, "days"));
                return lastDailyOutcomeQuery.first();
            })
            .then(function (lastDailyOutcome) {
                if (typeof lastDailyOutcome !== "undefined") {
                    entries.push(lastDailyOutcome);
                }

                response.success(entries);
            }, function (error) {
                response.error(error);
            });

    } else if (typeName === "Weekly") {
        var reflectionsQuery = getWeeklyReflectionQuery(momentDate.clone().subtract(7, "days"));
        reflectionsQuery.first()
            .then(function (weeklyReflection) {
                if (typeof weeklyReflection !== "undefined") {
                    entries.push(weeklyReflection);
                }

                var lastWeeksWeeklyOutcomeQuery = getWeeklyOutcomeQuery(momentDate.clone().subtract(7, "days"));
                return lastWeeksWeeklyOutcomeQuery.first();
            })
            .then(function (lastWeeksWeeklyOutcome) {
                if (typeof lastWeeksWeeklyOutcome !== "undefined") {
                    entries.push(lastWeeksWeeklyOutcome);
                }


                response.success(entries);
            }, function (error) {
                response.error(error);
            });
    } else {
        response.error("Invalid typeName");
    }
});

/*
 * Function to get all related entries for a reflection
 *
 * Weekly Reflection:
 * This weeks Monday Vision
 * Last Friday Reflection (if there is any).
 *
 *
 * Input:
 * typeName: outcome typeName (eg. Weekly)
 * outcomeDate: optional,
 */
Parse.Cloud.define("getRelatedEntriesForReflection", function(request, response) {
    var entries = [];

    var typeName = request.params.typeName;
    var momentDate = (typeof request.params.outcomeDate === "undefined") ? moment() : moment(request.params.outcomeDate);

    if (typeName === "Weekly") {
        var weeklyOutcomeQuery = getWeeklyOutcomeQuery(momentDate);

        weeklyOutcomeQuery.first()
            .then(function (weeklyOutcome) {
                if (typeof weeklyOutcome !== "undefined") {
                    entries.push(weeklyOutcome);
                }

                var reflectionsQuery = getWeeklyReflectionQuery(momentDate.clone().subtract(7, "days"));
                return reflectionsQuery.first();
            })
            .then(function (lastWeeklyReflection) {
                if (typeof lastWeeklyReflection !== "undefined") {
                    entries.push(lastWeeklyReflection);
                }

                response.success(entries);
            }, function (error) {
                response.error(error);
            });
    } else {
        response.error("Invalid typeName");
    }
});

function getDailyOutcomeQuery(optionalMomentDate) {
    var momentDate = (typeof optionalMomentDate === "undefined") ? moment() : optionalMomentDate;

    var dailyQuery = new Parse.Query("Outcome");
    dailyQuery.equalTo("typeName", "Daily");

    var startOfDay = momentDate.clone().startOf("day").toDate();
    dailyQuery.greaterThanOrEqualTo("effectiveDate", startOfDay);

    var endOfDay = momentDate.clone().endOf("day").toDate();
    dailyQuery.lessThan("effectiveDate", endOfDay);

    return dailyQuery;
}

function getWeeklyReflectionQuery(optionalMomentDate) {
    return getWeeklyQuery("Reflection", optionalMomentDate);
}

function getWeeklyOutcomeQuery(optionalMomentDate) {
    return getWeeklyQuery("Outcome", optionalMomentDate);
}

function getWeeklyQuery(className, optionalMomentDate) {
    var momentDate = (typeof optionalMomentDate === "undefined") ? moment() : optionalMomentDate;

    var weeklyQuery = new Parse.Query(className);
    weeklyQuery.equalTo("typeName", "Weekly");

    var startOfWeek = getStartOfWeekAsMoment(momentDate).toDate();
    weeklyQuery.greaterThanOrEqualTo("effectiveDate", startOfWeek);

    var endOfWeek = getEndOfWeekAsMoment(momentDate).toDate();
    weeklyQuery.lessThan("effectiveDate", endOfWeek);


    return weeklyQuery;
}

function getStartOfWeekAsMoment(momentDate) {
    return momentDate.clone().startOf("isoWeek");
}

function getEndOfWeekAsMoment(momentDate) {
    return momentDate.clone().endOf("isoWeek");
}