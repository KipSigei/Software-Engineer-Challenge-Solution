var request = require('request');
// funstion for checking if a value is in an array
function contains(array, value) {
    return !!~array.indexOf(value)
}
// function to be parsed to the array.sort to help sort based on any object property
function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function(a, b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}
// function to process the waterpoints data takes 2 parameters url for dataset and callback function because 
//of the async nature of the operation call the callback with two variables error and response e.g
//calculate("http://domain.com/data.json",function(error,response){ do whatever with the response});
function calculate(url, callback) {
    //make a get request to the url.
    request({
        url: url,
        json: true
    }, function(error, response, dataset) {
        if (!error && response.statusCode === 200) {
            //filter to get array of functional water points and and get the length of array as the number of funstional water
            //points           
            var numberOfFuctionalWaterPoints = dataset.filter(function(obj) {
                return obj.water_functioning === 'yes';
            }).length;
            // variable to store an array of cummunities in the dataset
            var listOfCommunities = [];
            //go through the whole dataset and get distinct community bases on the name contained in communities_villages
            dataset.map(function(obj) {
                // if community name isn't already in the communities array add it there
                if (!contains(listOfCommunities, obj.communities_villages)) {
                    listOfCommunities.push(obj.communities_villages);
                }
            });
            //get an array of comunites with required properties i.e comunity name, number of water points and number of broken water points(for ranking)
            var communitiesData = listOfCommunities.map(function(community) {
                var waterPoints = 0;
                var brokenWaterPoints = 0;
                //obj to store obtained info for each community
                var obtainedCommunityData = {};
                //go through the whole dataset to calculate number of functional water points
                dataset.map(function(elem) {
                    //incriment the number functional water points of respective communities 
                    if (elem.communities_villages === community) {
                        waterPoints++;
                        //if the waterpoint is not functiona; incriment for the current cimmunity
                        if (elem.water_functioning != "yes") {
                            brokenWaterPoints++;
                        }
                    }
                });
                obtainedCommunityData['community'] = community;
                obtainedCommunityData['waterPoints'] = waterPoints;
                obtainedCommunityData['brokenWaterPoints'] = brokenWaterPoints;
                return obtainedCommunityData;
                /*dataset.filter(function(obj) {
                return obj.communities_villages===community;
        });*/
            });
            //sort the data based on number of broken water points
            communitiesData.sort(dynamicSort('brokenWaterPoints'));
            //array to contain list of distinct number of broken water points to help in ranking
            var ranks = [];
            //populate the array with the distinct list of broken water points values
            communitiesData.map(function(obj) {
                if (!contains(ranks, obj.brokenWaterPoints)) {
                    ranks.push(obj.brokenWaterPoints);
                }
            });
            //reverse the array to use index to rank
            ranks.reverse();
            //rank the communities using the ranks list
            var rankedcommunitiesData = communitiesData.map(function(elem) {
                //add a rank property to each community object
                elem.rank = ranks.indexOf(elem.brokenWaterPoints) + 1;
                return elem;
            });
            //create the result object
            var result = {
                    numberFunctional: numberOfFuctionalWaterPoints,
                    communitiesReport: rankedcommunitiesData
                }
                //console.log(result);
                //var error="shit";
        }
        return callback(error, result);
    });
}
calculate("https://raw.githubusercontent.com/onaio/ona-tech/master/data/water_points.json", function(error, res) {
    //if there is an error show it else show the results
    if (error) {
        console.error(error);
    } else {
        console.log(res);
    }
});