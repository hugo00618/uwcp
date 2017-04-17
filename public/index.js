var HOST_NAME = "http://localhost:4000/";

var app = angular.module("myApp", []);
app.controller("myCtrl", function($scope) {
    $.ajax(HOST_NAME + 'getRoutePlaces', {
        dataType: 'json',
        success: function(response) {
            var $scope = $('body').scope();
            $scope.routePlaces = response;
            $scope.$apply();
        },
        error: function(response) {
            // console.log(response);
        }
    });

    $scope.searchRoute = function() {
        $('.select.ng-invalid').each(function() {
            $(this).closest('.selectContainer').addClass('invalid-value');
        });

        if ($scope.origin != null && $scope.dest != null) {
            window.location = window.location.origin + '/search.html?origin=' + $scope.origin.code + '&dest=' + $scope.dest.code;
        }
    }
});
