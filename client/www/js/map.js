var baseUrl = "http://z-api.herokuapp.com/";
var map; // global for use in add.js may need to refactor
var bathInfoWindow; // singleton
var BIDSet;
var API_KEY = "AIzaSyA_3-FTpr5X41YFGR-xFHVZMbjcU-BJp1Q"; // google maps api key (jeff's acc)
var currentBID;
var addMarker; // marker for adding
var addinfowindow;
var bathrooms = {};
var placesService;
var DEFAULT_ZOOM = 17;
var NUM_REVIEWS = 5; // max number of reviews to show initially
var currentLocationMarker; // blue dot to show current location

$(document).bind("mobileinit", function() {
    console.log("in mobileinit");
    $.support.cors = true;
    $.mobile.allowCrossDomainPages = true;
});

$(document).on('pageinit', '#main-app', function (event) {
    var getBid = get("bid");
    if (getBid) {
        currentBID = getBid;
        onDetailsLoad(true);
    }
});
// Show the main map with user's position and bathrooms close to the user
$(document).ready(function() {
    console.log("map page loaded");
    $('#loading').hide();
    $('#content').show();
    BIDSet = new MiniSet();
    bathInfoWindow = new google.maps.InfoWindow({noSupress: true});
    fixInfoWindow();
    showOnMap();
    $( document ).on( "swipeleft swiperight", "#account-page", function( e ) {
        // We check if there is no open panel on the page because otherwise
        // a swipe to close the left panel would also open the right panel (and v.v.).
        // We do this by checking the data that the framework stores on the page element (panel: open).
        if ( $.mobile.activePage.jqmData( "panel" ) !== "open" ) {
            if ( e.type === "swipeleft"  ) {
                //$( "#right-panel" ).panel( "open" );
            } else if ( e.type === "swiperight" ) {
                $( "#header" ).panel( "open" );
            }
        }
    });
    $('#linkclick').click(function() {
        $('#linktext').show().val(window.location.href.split("?")[0] + "?bid="+currentBID).select();
        $('#linkclick').hide();
        toast("Hit Ctrl+C now to copy the link.")
    });

    $('#back-to-map').click(function() {$('#map-page-link').click();});
    $('#closebutton').click(function() {
        $('#bathroom-details-page').panel("close");
    });
    $('#closebuttonadd').click(function() {
        $('#add-details-page').panel("close");
    });
    // NAVBAR =================================

    var navlist = $('#header ul');
    $('li', navlist).click(function() {
        console.log("clicked a navbutton");
        $('#header').panel("close");
        google.maps.event.trigger(map, 'resize');
        console.log("triggered resize nalist");
    });
    $('#add-page-link', navlist).click(function() {
        if (bathInfoWindow) {
            bathInfoWindow.close(); // hide the info window when going to add
        }
        toast("Tap to add...");
    });

    // END NAVBAR =================================

    $('#uemail').text(window.localStorage.email); // set user email on account page
    if (window.localStorage.loc) {
        $('#ulocation').text(window.localStorage.loc);
    }
    $('#change-email').val(window.localStorage.email); // set user email on change email page
    waitToLocate();
});
function waitToLocate() {
    if (map == null) {
        setTimeout(waitToLocate, 50);
    } else {
        locate();
    }
}
$(document).bind('pagechange', '#content', function (event, data) {
    if (data.toPage[0].id == 'main-app') {
        google.maps.event.trigger(map, 'resize'); // prevent greyboxes
        console.log("triggered resize pagechange");
        $('#map-page-link').click();
        locate();
    }
});

// Draws a marker with the passed position on a map
var showOnMap = function() {
    console.log("showing map");
    var setup = function (response) {
        if (response.loc != undefined) {
            var loc = response.loc.split(',');
            var latitude = loc[0];
            var longitude = loc[1];
        } else {
            var latitude = "47.6097";
            var longitude = "-122.3331";
        }
        var myLatlng = new google.maps.LatLng(latitude, longitude);
        var location = latitude + "," + longitude;
        var mapOptions = {
            center: myLatlng,
            mapTypeControl: false,
            streetViewControl: false,
            panControl: false,
            zoomControl: false,
            //minZoom: 12,
            zoom: DEFAULT_ZOOM,
            tilt: 45,
        };
        map = new google.maps.Map(document.getElementById("map_canvas"),
            mapOptions);
        placesService = new google.maps.places.PlacesService(map);
        var noPoi = [
        // {
        //     featureType: "poi",

        //     stylers: [
        //       { visibility: "simplified" }
        //     ]
        //   },
          // {
          //   featureType: "road",

          //   stylers: [
          //     { visibility: "simplified" }
          //   ]
          // }
        ];

        map.setOptions({styles: noPoi});

        google.maps.event.addListener(map, "idle", function (event) {
                //console.log("idle");
                getBathrooms(map.getCenter(), map);
            });
        google.maps.event.addListener(map, "dragstart", function (event) {
            $('#locate img').attr("src", "img/geolocation.png");
            closePanels();
        });
        google.maps.event.addListener(map, "click", function (event) {
            closePanels();
        });

        getBathrooms(myLatlng, map);
    };
    $.get("http://ipinfo.io", setup, "jsonp").fail(setup);
};

function closePanels() {
    if ($(window).width() > 600) {
        $('#header').panel("close");
    } else {
        $('.panel').panel("close");
    }
}

// gets all bathrooms near LatLng position and displays them to map
var getBathrooms = function(LatLng, map) {
    //console.log("getting nearby bathrooms");
    getReq(baseUrl+"getallnear/"+LatLng.lat()+","+LatLng.lng(),
        function (data, status) {
            var marker;
            for (var i = 0; i < data.bathrooms.length; i++) {
                var currentB = data.bathrooms[i];
                var bid = currentB._id;
                if (!BIDSet.has(bid)) {
                    var name = currentB.name;
                    //console.log("creating bathroom: " + name);
                    BIDSet.add(bid);
                    bathrooms[bid] = currentB;
                    // get details about each bathroom
                    var lat = currentB.location.lat;
                    var lng = currentB.location.lng;
                    var genderNum = currentB.gender;
                    var upvotes = currentB.upvotes;
                    var downvotes = currentB.downvotes;
                    var gender;
                    var type = typeNumToString(currentB.access);
                    var distance = currentB.distance;
                    var genderFA;
                    if (genderNum == 0) {
                        gender = "Men's";
                        genderFA = '<i class="fa fa-male fa-2x"></i>'
                    } else if (genderNum == 1) {
                        gender = "Women's";
                        genderFA = '<i class="fa fa-female fa-2x"></i>'
                    } else {
                        gender = "Unisex";
                    }

                    var newBathPos = new google.maps.LatLng(lat, lng);

                    marker = new google.maps.Marker({
                        position: newBathPos,
                        map: map,
                        title: name
                        //animation: google.maps.Animation.DROP
                    });
                    bathrooms[bid].marker = marker;
                    var netVotes = upvotes - downvotes;
                    var style = "";
                    if (netVotes > 0) {
                        style = "color: green;";
                    } else if (netVotes < 0) {
                        style = "color: red;";
                    }

                    var content = '<div class="content">' + parseInt(distance) + 'm' +
                        '<h3 class="firstHeading"><div class="gender">' + genderFA + "</div>" +
                            '<div class="name">' + name + '</div></h3>' +
                        '<div id="bodyContent">' +
                        '<div class="ratings"><i class="fa fa-thumbs-up rating">' + upvotes +'</i>' +
                        '<i class="fa fa-thumbs-down rating">' + downvotes +'</i></div>' +
                        "<br><a href='#' data-theme='b' class='ui-btn ui-btn-inline ui-icon-arrow-r ui-btn-icon-right ui-mini' data-transition='slide'>Reviews</a></div>";

                    var markerClickCallback = function (marker, content, infowindow, bid) {
                        return function() {
                            infowindow.setContent(content);
                            infowindow.open(map, marker);
                            currentBID = bid;
                            $('#header').panel("close");
                            onDetailsLoad();
                        };
                    };
                    google.maps.event.addListener(marker, 'click', markerClickCallback(marker, content, bathInfoWindow, bid));
                }
            }
        });
};

function typeNumToString(num) {
    if (num == 0) {
        return "Public";
    } else if (num == 1) {
        return "Customers";
    } else {
        return "Customers Only";
    }
}

// called when user clicks on locate div
function locate() {
    $('#locate img').attr("src", "img/geolocationblue.png");
    navigator.geolocation.getCurrentPosition(centerMap);
}

//centers map on position
function centerMap(position, ignoreMarker) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;
    var myLatlng = new google.maps.LatLng(latitude, longitude);
    if (!ignoreMarker) {
        if (!currentLocationMarker) {
            var infowindow = new google.maps.InfoWindow({
                content: 'You are here!',
                noSupress: true
            });
            currentLocationMarker = new google.maps.Marker({
                position: myLatlng,
                map: map,
                icon: {path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#33CCFF',
                    fillOpacity: 0.9,
                    strokeWeight: 2,
                    strokeColor: 'silver',
                    scale: 8}
            });
            google.maps.event.addListener(currentLocationMarker, 'click', function() {
                infowindow.open(map,currentLocationMarker);
            });
        }
        currentLocationMarker.setPosition(myLatlng);
    }
    map.panTo(myLatlng);
    var zoom = map.getZoom();
    setTimeout(smoothZoom(map, DEFAULT_ZOOM, zoom), 150);
}




function confirmPopup(event) {
    var lat = event.latLng.lat();
    var lng = event.latLng.lng();
    if (addMarker) {
        addMarker.setMap(null);
    }
    addMarker = new google.maps.Marker({
        position: new google.maps.LatLng(lat, lng),
        map: map,
        title: "Selected",
        animation: google.maps.Animation.DROP
    });
    setTimeout(function() {addinfowindow.open(map, addMarker);}, 300);
};


// if boolCenter is true it will center the map on this ID marker if it exists
function onDetailsLoad(boolCenter) {
    var currentBath = bathrooms[currentBID];
    if (!currentBath) {
        // bathroom doesnt exist in our local array, we have to fetch it
        getReq(baseUrl + "getbathroom/" + currentBID, function (res, status) {
            bathrooms[currentBID] = res.bathroom;
            currentBath = bathrooms[currentBID];
            actuallyLoadDetails(currentBath, boolCenter);
        }).fail(function (err) {
            console.log("couldn't find bathroom: " + currentBID);
            return;
        });
    } else {
        // bathroom exists locally
        actuallyLoadDetails(currentBath, boolCenter);
    }
}

// called when details button is clicked, gets bathroom info
function actuallyLoadDetails(currentBath, boolCenter) {
    var list = $('#bdetailslist');
    var panel = $('#bathroom-details-page');
    $('.error', panel).text(""); // clear errors
    if ($(window).width() > 600) {
       panel.panel("open");
   }
    $('#linkclick', panel).show();
    $('#linktext', panel).hide();
    var res = {};
    res.bathroom = currentBath;
    if (boolCenter) {
        var lat = res.bathroom.location.lat;
        var lng = res.bathroom.location.lng;
        setTimeout(function(){centerMap({coords: {latitude: lat, longitude: lng}}, true);}, 1500);
    }
    var bname = $('#bname', panel);
    var oldName = bname.text();

    bname.text(res.bathroom.name);
    bname.attr("href", "");
    bname.addClass("nopoint");
    $('#baccess', panel).text(typeNumToString(res.bathroom.access));

    var netVotes = res.bathroom.upvotes - res.bathroom.downvotes;
    var brating = $('#brating');
    brating.removeClass("red green");
    if (netVotes > 0) {
        brating.css("color", "green");
    } else if (netVotes < 0) {
        brating.css("color", "red");
    }
    // '<div class="ratings"><i class="fa fa-thumbs-up rating">' + upvotes +'</i>' +
    //                 '<i class="fa fa-thumbs-down rating">' + downvotes +'</i></div>' +
    $('#brating').text(netVotes);
    console.log(res);
    if (res.bathroom.placesRef) {
        placesService.getDetails({key: API_KEY, reference: res.bathroom.placesRef, sensor: true}, function (res, status) {
            console.log(res);
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                console.log("getDetails sucess");
                bname.attr("href", res.url);
                bname.removeClass("nopoint");
            } else {
                console.log("error details");
            }
        });
    } else {
        console.log("no places ref");
    }
    save('reviews', null);
    getReviews();
    $('#review-form')[0].reset();
};

// Gets reviews and displays them in the bathroom details
var getReviews = function() {
    $('#bathroom-details-page').animate({scrollTop:0}, '500', 'swing');
    var list = $('#bdetailslist');
    getReq(baseUrl+"getreviews/"+currentBID, function (res) {
        $('.review', list).remove();
        var moreReviewsBtn = $('#more-reviews');
        var reviews = res.bathroom.reviews.reverse();
        if (reviews.length == 0) {
            list.append($('<li class="review">No reviews... yet!</li>'));
            moreReviewsBtn.hide();
        } else {
            for (var i = 0; i < Math.min(reviews.length, NUM_REVIEWS); i++) {
                appendReview(list, reviews[i]);
            }
            if (reviews.length > NUM_REVIEWS) {
                moreReviewsBtn.show();
                window.localStorage.reviews = JSON.stringify(reviews);
            } else {
                moreReviewsBtn.hide();
            }
        }
        list.listview("refresh");
    }).fail(function (err) {
        $(".error", list.parent()).text(err.responseJSON.errors);
    });
}
function appendReview(list, myReview) {
    $('<li class="review"><div class="card"><q>'+myReview.review+'</q></div></li>').hide().appendTo(list).slideDown();
}

// Handler upon submitting a new review for a bathroom
$('#review-form').submit(function (e) {
    e.stopImmediatePropagation();
    e.preventDefault();
    var form = $('#review-form');
    $('.error', form).text("");
    var cleanliness = $('input[name="clean"]', form).prop('checked');
    if (cleanliness) {
        cleanliness = 5;
    } else {
        cleanliness = 1;
    }
    var vote = $('input[name="vote"]', form).val(); // TODO send vote to api
    if (vote == '0') {
        vote = "-1";
    }
    var review = $('#add-review-text').val();
    var formData = {
        "bid": currentBID,
        "cleanliness": cleanliness,
        "review": review
    };
    postReq(baseUrl + "addreview", formData, function(res) {
        $('#review-form')[0].reset();
        getReviews();
        console.log("successfully added review");
    }).fail(function(err) {
        $("#review-form .error").text(err.responseJSON.errors);
    });
    postReq(baseUrl + "addvote", {"bid": currentBID, "voteDir": vote}, function(res) {
        console.log("succesfully added vote");
    });
});

// Handler for clicking the more button to show more reviews
$('#more-reviews').click(function() {
    var reviews = JSON.parse(window.localStorage.reviews);
    var list = $('#bdetailslist');
    if (reviews) {
        for (var i = NUM_REVIEWS; i < reviews.length; i++) {
            appendReview(list, reviews[i]);
        }
    }
    list.listview("refresh");
    $('#more-reviews').hide();
});

function tryLogin(err) {
    if (err.status == 401) {
        $.get(baseUrl+"validatetoken/"+window.localStorage.token, function(res) {
            console.log("signin successful");
        }).fail(function(err) {
            window.location.replace('index.html');
            console.log("failed to login");
        });
    }
}

// EXTRA STUFF

function getReq(url, success) {
    return $.ajax({
        url: url,
        type: "GET",
        beforeSend: function(xhr){xhr.setRequestHeader('access', window.localStorage.token)},
        success: success
    });
}
function postReq(url, data, success) {
    return $.ajax({
        url: url,
        type: "POST",
        data: data,
        beforeSend: function(xhr){xhr.setRequestHeader('access', window.localStorage.token)},
        success: success
    });
}
//gets a get parameter
function get(name){
   if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(window.location.href))
      return decodeURIComponent(name[1]);
}
function smoothZoom (map, max, cnt) {
    if (cnt >= max) {
            return;
        }
    else {
        z = google.maps.event.addListener(map, 'zoom_changed', function(event){
            google.maps.event.removeListener(z);
            smoothZoom(map, max, cnt + 1);
        });
        setTimeout(function(){map.setZoom(cnt)}, 80); // 80ms is what I found to work well on my system -- it might not work well on all systems
    }
}

function save (key, value) {
    window.localStorage[key] = value;
};

function toast(message) {
    $('#toast').text(message);
    $('#toast').fadeIn("slow");
    setTimeout(function(){$('#toast').fadeOut("slow")}, 2500);
};

//infowindow fix:
function fixInfoWindow() {
    //If it is called for map option, we hide InfoWindow, if "noSupress" option isnt true.
    var set = google.maps.InfoWindow.prototype.set;
    google.maps.InfoWindow.prototype.set = function (key, val) {
        if (key === 'map') {
            if (!this.get('noSupress')) {
                if (addListener) {
                    var event = {latLng: this.position};
                    confirmPopup(event);
                }
                return;
            }
        }
        set.apply(this, arguments);
    }
};