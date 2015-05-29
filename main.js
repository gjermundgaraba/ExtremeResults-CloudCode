

/*
 * Function to get all Agile Results type entries (Daily Outcomes, Monday Visions, Weekly Reflections, etc...)
 *
 * Returns an array sorted by created date
 */
Parse.Cloud.define("getEntries", function(request, response) {
    var entries = [];

    var dailyOutcomesQuery = new Parse.Query("DailyOutcome");
    var mondayVisionQuery = new Parse.Query("MondayVision");
    var weeklyReflectionsQuery = new Parse.Query("WeeklyReflection");

    dailyOutcomesQuery.find()
        .then(function(dailyOutcomes) {
            entries.push.apply(entries, dailyOutcomes);

            return mondayVisionQuery.find();
        })
        .then(function(mondayVisions) {
            entries.push.apply(entries, mondayVisions);

            return weeklyReflectionsQuery.find();
        })
        .then(function(weeklyReflections) {
            entries.push.apply(entries, weeklyReflections);

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


