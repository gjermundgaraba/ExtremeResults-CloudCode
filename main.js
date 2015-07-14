var moment = require('moment');

/*
 * Function to get all Agile Results type entries (Daily Outcomes, Monday Visions, Weekly Reflections, etc...)
 *
 * Returns an array sorted by created date
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
        var dateA = new Date(a.createdAt);
        var dateB = new Date(b.createdAt);

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
    console.log("Start Date For Daily: " + startDateForDaily);
    dailyOutcomeQuery.greaterThanOrEqualTo("createdAt", startDateForDaily);

    var finishDateForDaily = moment().endOf("day").toDate();
    console.log("Finish Date For Daily: " + finishDateForDaily);
    dailyOutcomeQuery.lessThan("createdAt", finishDateForDaily);


    // Weekly
    var weeklyOutcomeQuery = new Parse.Query("Outcome");
    weeklyOutcomeQuery.equalTo("typeName", "Weekly");

    var startOfWeek = moment().day(1).startOf("day").toDate();
    var endOfWeek = moment().day(7).endOf("day").toDate();

    console.log("Start Of The Week: " + startOfWeek);
    weeklyOutcomeQuery.greaterThanOrEqualTo("createdAt", startOfWeek);

    console.log("End Of The Week: " + endOfWeek);
    weeklyOutcomeQuery.lessThan("createdAt", endOfWeek);

    dailyOutcomeQuery.first()
        .then(function (dailyOutcome) {
            console.log("Result for Daily Outcome: " + dailyOutcome);
            if (dailyOutcome !== undefined) {
                entries.push(dailyOutcome);
            }

            return weeklyOutcomeQuery.first();
        })
        .then(function (weeklyOutcome) {
            console.log("Result for Weekly Outcome: " + weeklyOutcome);
            if (weeklyOutcome !== undefined) {
                entries.push(weeklyOutcome);
            }

            response.success(entries);
        }, function (error) {
            response.error(error);
        });

});

