var HOST_NAME = "http://localhost:4000/";

var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

window.fbAsyncInit = function() {
    FB.init({
        appId: '191281804711015',
        xfbml: true,
        version: 'v2.8'
    });
    FB.AppEvents.logPageView();
    fbAuthInit();
};

(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

fbAuthInit = function() {
    FB.login(function(response) {
        if (response.authResponse) {
            onloadPage();
        } else {
            console.log('User cancelled login or did not fully authorize.');
        }
    });
}

function onloadPage() {
    loadFeed(null, processData);
}

function loadFeed(url, _callback) {
    if (!url) {
        url = "/372772186164295/feed";
    }
    FB.api(
        url,
        function(response) {
            _callback(response);
        });
}

function processData(response) {
    var post = response.data[Math.floor(Math.random() * 24)];

    var postLink = "https://www.facebook.com/" + post.id.replace(/_/, "/posts/");

    var message = post.message.replace(/(\r\n|\n|\r)/gm, " "); // remove \n
    message = message.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '') // remove emoji

    var updatedTime = post.updated_time;


    var posts = [{
        "message": "Looking for a ride from Scarbrough to Waterloo Friday afternoon.",
        "updatedTime": "2017-04-13T18:35:33+0000",
        "link" : ""
    }];
    posts = [];


    posts.push({
        "message": message,
        "updatedTime": updatedTime,
        "link": postLink
    });

    posts.forEach(function(post) {
        console.log(post);

        $.ajax(HOST_NAME + 'process', {
            dataType: 'json',
            headers: {
                'text': post.message,
                'time': post.updatedTime
            },
            success: function(response) {
                var data = response.data;
                console.log(data);

                var date = new Date(data.date);
                // user-friendly time
                var timeStr = getTimeStr(date);

                var $scope = $('body').scope();
                if (!$scope.carpoolRecords) {
                    $scope.carpoolRecords = [];
                }

                data.routes.forEach(function(route) {
                    var post = {
                        "originLine1": route.origin_locs[0],
                        "originLine2": route.origin_locs[1] ? route.origin_locs[1] : "",
                        "originCode": route.origin_area,
                        "destinationLine1": route.dest_locs[0],
                        "destinationLine2": route.dest_locs[1] ? route.dest_locs[1] : "",
                        "destinationCode": route.dest_area,
                        "dateRaw": data.date,
                        "date": MONTHS[date.getMonth()] + " " + date.getDate(),
                        "time": timeStr,
                        "day": DAYS[date.getDay()],
                        "price": data.price,
                        "link": postLink
                    };
                    $scope.carpoolRecords.push(post);
                });

                $scope.carpoolRecords.sort(function(p1, p2) {
                    if (p1.originCode == p2.originCode) {
                        if (p1.destinationCode == p2.destinationCode) {
                            if (p1.dateRaw == p2.dateRaw) {
                                return false;
                            } else {
                                return p1.dateRaw > p2.dateRaw;
                            }
                        } else {
                            return p1.destinationCode > p2.destinationCode;
                        }
                    } else {
                        return p1.originCode > p2.originCode;
                    }
                });

                $scope.$apply();
            },
            error: function(response) {
                console.log(response);
            }
        });
    });



    // var terms = nlp(message, lexicon).terms().data();

    var nextURL = response.paging.next;
}

var app = angular.module("myApp", []);
app.controller("myCtrl", function($scope) {

});

function getTimeStr(date) {
    var timeString;
    var hour = date.getHours();
    var am = true;
    if (hour >= 12) {
        am = false;
        if (hour > 12) {
            hour -= 12;
        }
    }
    if (hour == 0) {
        hour = 12;
    }
    timeString = hour + ":" + ("0" + date.getMinutes()).slice(-2) + (am ? " AM" : " PM");

    if (timeString == "12:00 AM") {
        timeString = "N/A";
    }

    return timeString;
}
