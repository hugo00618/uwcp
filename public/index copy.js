var lexicon = {
    'bk': 'Place',
    'downtown': 'Place',
    'dt': 'Place',
    'finch': 'Place',
    'fairview': 'Place',
    'gta': 'Place',
    'loo': 'Place',
    'markham': 'Place',
    'mississauga': 'Place',
    'north york': 'Place',
    'pacific mall': 'Place',
    'pmall': 'Place',
    'p-mall': 'Place',
    'pearson': 'Place',
    'richmond hill': 'Place',
    'scarborough': 'Place',
    'scarborough town centre': 'Place',
    'stc': 'Place',
    'sheppard': 'Place',
    'square one': 'Place',
    'trt': 'Place',
    'waterloo': 'Place',
    'yonge': 'Place',
    'yorkdale': 'Place'
}

var separators = ['/', '&', '(', ')', '[', ']'];

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
    var message = addSpaces(post.message);
    message = "DRIVING - Finch Station --> Waterloo BK [Tues Apr 11 @ 9:00am] $15 - Inbox + comment if interested";
    console.log(message);

    var terms = nlp(message, lexicon).terms().data();

    var listeningFields = { "origin": 1, "destination": 2 };
    var listeningField = 0;

    // add type
    var adTypeOffer = true;

    // route
    var origins = [];
    var destinations = [];
    var unusedPlaces = [];

    // date

    console.log(terms);
    for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var bestTag = term.bestTag;
        var normal = term.normal;

        if (normal == ">" && term.spaceBefore.indexOf('-') != -1 && unusedPlaces.length > 0) {
            origins = origins.concat(unusedPlaces);
            unusedPlaces = [];
            listeningField = listeningFields.destination;
            continue;
        }

        switch (bestTag) {
            case "Date":
                if (normal == "today") {

                }
            case "Noun":
                if ($.inArray("Place", term.tags) != -1) {
                    switch (listeningField) {
                        case listeningFields.origin:
                            origins.push(normal);
                            break;
                        case listeningFields.destination:
                            destinations.push(normal);
                            break;
                        default:
                            unusedPlaces.push(normal);
                            break;
                    }
                }
                break;
            case "Preposition":
                if (normal == "from") {
                    listeningField = listeningFields.origin;
                } else if (normal == 'to') {
                    // origin already scanned and is in unusedPlaces
                    if (unusedPlaces.length > 0) {
                        origins = origins.concat(unusedPlaces);
                        unusedPlaces = [];
                    }
                    listeningField = listeningFields.destination;
                }
                break;
            case "Verb":
                if (normal == "looking") {
                    adTypeOffer = false;
                }
                break;
            default:
                break;
        }
    }

    if (origins.length == 0) {
        origin = "waterloo";
    }

    console.log((adTypeOffer ? "Driving" : "Looking for"));
    console.log(origins);
    console.log(destinations);

    var nextURL = response.paging.next;
}

function addSpaces(str) {
    for (var i = 0; i < separators.length; i++) {
        var rg = new RegExp("\\" + separators[i], "g");
        str = str.replace(rg, " " + separators[i] + " ");
    }
    return str;
}

var app = angular.module("myApp", []);
app.controller("myCtrl", function($scope) {
    $scope.carpoolRecords = [{
        "originLine1": "Downtown",
        "originLine2": "Toronto",
        "originCode": "DT",
        "destinationLine1": "Burger King Plaza",
        "destinationLine2": "Waterloo",
        "destinationCode": "BK",
        "date": "Apr 7",
        "time": "3:00PM",
        "day": "Friday",
        "price": 15
    }, {
        "originLine1": "Scarborough Town Centre",
        "originLine2": "",
        "originCode": "STC",
        "destinationLine1": "Burger King Plaza",
        "destinationLine2": "Waterloo",
        "destinationCode": "BK",
        "date": "Apr 10",
        "time": "6:00PM",
        "day": "Monday",
        "price": 15
    }, {
        "originLine1": "Fairview Mall",
        "originLine2": "North York",
        "originCode": "FVM",
        "destinationLine1": "Waterloo",
        "destinationLine2": "",
        "destinationCode": "WAT",
        "date": "Apr 9",
        "time": "10:00PM",
        "day": "Sunday",
        "price": 15
    }, {
        "originLine1": "Pacific Mall",
        "originLine2": "Markham",
        "originCode": "PML",
        "destinationLine1": "Waterloo",
        "destinationLine2": "",
        "destinationCode": "WAT",
        "date": "Apr 9",
        "time": "9:00PM",
        "day": "Sunday",
        "price": 15
    }]
});
