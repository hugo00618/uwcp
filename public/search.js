var HOST_NAME = "http://localhost:4000/";

var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

window.fbAsyncInit = function() {
    FB.init({
        appId: '191281804711015',
        xfbml: true,
        version: 'v2.8'
    });

    FB.getLoginStatus(fbLoginCallback);

    // FB.AppEvents.logPageView();
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

var fbLoginCallback = function(response) {
    $('#loadingSpinner').hide();
    if (response.status == 'connected') {
        $('#fbLoginButton').hide();
        $('#searchForm').css('display', 'block');
        loadFeed("/372772186164295/feed", processPosts);
    } else {
        $('#fbLoginButton').css('display', 'block');
        FB.login(function(response) {
            console.log("log in");
        });
    }
}

$(document).ready(function() {
    $('#fbLoginButton').click(function() {
        $('#fbLoginButton').hide();
        $('#loadingSpinner').show();
        FB.login(fbLoginCallback);
    });
});

function loadFeed(url, _callback) {
    FB.api(
        url,
        function(response) {
            _callback(response);
        });
}

function processPosts(response) {
    var posts = response.data;

    var passedVars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        passedVars[key] = value;
    });

    // posts.push({
    //     "message": message,
    //     "updatedTime": updatedTime,
    //     "link": postLink
    // });

    posts.forEach(function(post) {
        var message = post.message.replace(/(\r\n|\n|\r)/gm, " "); // remove \n
        message = message.replace(/[^\x00-\x7F]/g, ""); // remove non ascii

        var myPostIsOffer = message.match(/looking for/i) == null ? "true" : "false"
        if (myPostIsOffer != passedVars.postIsOffer) {
            return;
        }

        console.log(message);

        var postLink = "https://www.facebook.com/" + post.id.replace(/_/, "/posts/");

        $.ajax(HOST_NAME + 'process', {
            dataType: 'json',
            headers: {
                'text': message,
                'time': post.updated_time
            },
            success: function(response) {
                var data = response.data;

                var date = new Date(data.date);
                // user-friendly time
                var timeStr = getTimeStr(date);

                var $scope = $('body').scope();
                if (!$scope.carpoolRecords) {
                    $scope.carpoolRecords = [];
                }

                data.routes.forEach(function(route) {
                    var post = {
                        "originCode": route.originArea,
                        "originLine1": route.originPlace1,
                        "originLine2": route.originPlace2,
                        "destCode": route.destArea,
                        "destLine1": route.destPlace1,
                        "destLine2": route.destPlace2,
                        "dateRaw": data.date,
                        "date": MONTHS[date.getMonth()] + " " + date.getDate(),
                        "time": timeStr,
                        "day": DAYS[date.getDay()],
                        "price": data.price,
                        "link": postLink
                    };
                    $scope.carpoolRecords.push(post);
                });

                // $scope.carpoolRecords.sort(function(p1, p2) {
                //     if (p1.originCode == p2.originCode) {
                //         if (p1.destinationCode == p2.destinationCode) {
                //             if (p1.dateRaw == p2.dateRaw) {
                //                 return false;
                //             } else {
                //                 return p1.dateRaw > p2.dateRaw;
                //             }
                //         } else {
                //             return p1.destinationCode > p2.destinationCode;
                //         }
                //     } else {
                //         return p1.originCode > p2.originCode;
                //     }
                // });

                $scope.$apply();
            },
            error: function(response) {
                // console.log(response);
            }
        });
    });
    
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
