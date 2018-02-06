var app = angular.module('freezerinventoryApp',['ui.bootstrap','ngMessages']);

app.filter('startFrom', function () {
	return function (input, start) {
		if (input) {
			start = +start;
			return input.slice(start);
		}
		return [];
	};
});

//  inspiration from https://weblogs.asp.net/dwahlin/building-an-angularjs-modal-service
app.service('modalService', ['$uibModal',
  function ($uibModal) {

    var modalDefaults = {
	    backdrop: true,
	    keyboard: true,
	    modalFade: true,
	    templateUrl: '/templates/modalGeneric.html'
    };

    var modalOptions = {
      closeButtonText: 'Close',
      actionButtonText: 'OK',
      headerText: 'Proceed?',
      bodyText: 'Perform this action?'
    };

    this.showModal = function (customModalDefaults, customModalOptions) {
      if (!customModalDefaults) customModalDefaults = {};
      customModalDefaults.backdrop = 'static';
      return this.show(customModalDefaults, customModalOptions);
    };

    this.show = function (customModalDefaults, customModalOptions) {
      //Create temp objects to work with since we're in a singleton service
      var tempModalDefaults = {};
      var tempModalOptions = {};

      //Map angular-ui modal custom defaults to modal defaults defined in service
      angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

      //Map modal.html $scope custom properties to defaults defined in service
      angular.extend(tempModalOptions, modalOptions, customModalOptions);

      if (!tempModalDefaults.controller) {
        tempModalDefaults.controller = function ($scope, $uibModalInstance) {
					$scope.modalOptions = tempModalOptions;

					$scope.modalOptions.ok = function (result) {
              $uibModalInstance.close(result);
          };
          $scope.modalOptions.close = function (result) {
              $uibModalInstance.dismiss('cancel');
          };
        };
      }
      return $uibModal.open(tempModalDefaults).result;
    };
}]);

app.directive('datepickerDirective', function() {
  return {
    scope: {
      model: '=ngModel'
    },
    restrict: 'A',
    templateUrl: '/templates/datepicker.html',
    controller: function($scope) {
			$scope.minDate = new Date();
			$scope.format = 'yyyy-MM-dd';

      $scope.open = function() {
        $scope.status.opened = true;
      };

      $scope.status = {
        opened: false
      };
    }
  }
});

app.controller('mainController', [ '$scope', 'filterFilter', '$http', '$uibModal', 'modalService', function ($scope, filterFilter, $http, $uibModal, modalService) {
  $scope.inventoryitems = [];
  $scope.sortType     = 'id'; // set the default sort type
  $scope.sortReverse  = false;  // set the default sort order
  $scope.searchItem   = '';     // set the default search/filter term

  var request = $http.get('/inventoryitems');
  request.success(function(inventoryitems) {
    $scope.inventoryitems = inventoryitems;
		console.log('OK: ' + inventoryitems);
		InitPagination();
  });
  request.error(function(inventoryitems){
    console.log('Error: ' + inventoryitems);
  });

  // create empty search model (object) to trigger $watch on update
	$scope.search = ''; // {};

	$scope.resetFilters = function () {
		// needs to be a function or it won't trigger a $watch
		$scope.search = ''; // {};
	};

	// pagination controls
	function InitPagination() {
		$scope.currentPage = 1;  // was 1
		$scope.totalItems = $scope.inventoryitems.length;
		$scope.entryLimit = 8; // items per page
		$scope.noOfPages = Math.ceil($scope.totalItems / $scope.entryLimit);
		return;
	}

	// $watch search to update pagination
	$scope.$watch('search', function (newVal, oldVal) {
		$scope.filtered = filterFilter($scope.inventoryitems, newVal);
		$scope.totalItems = $scope.filtered.length;
		$scope.noOfPages = Math.ceil($scope.totalItems / $scope.entryLimit);
		$scope.currentPage = 1;
	}, true);

	$scope.IsWarning = function(x) {
		var DateNow = new Date();
		var DateUseBefore = new Date(x)

		//Get 1 day in milliseconds
		var one_day=1000*60*60*24;
		// Convert both dates to milliseconds
		var date1_ms = DateNow.getTime();
		var date2_ms = DateUseBefore.getTime();

		// Calculate the difference in milliseconds
		var difference_ms = date2_ms - date1_ms;

    // if already past last day, don't warn
		if( difference_ms < 0 ) {
			return false;
		}
		
		// Convert back to days and return
		var diff = Math.round(difference_ms/one_day);

		if( diff > 30 ) {
			return false;
		}
		else {
			return true;
		}
  };

	$scope.IsDanger = function(x) {
		var DateNow = new Date();
		var DateUseBefore = new Date(x)

		// Convert both dates to milliseconds
		var date1_ms = DateNow.getTime();
		var date2_ms = DateUseBefore.getTime();

		if( date2_ms > date1_ms ) {
			return false;
		}
		else {
			return true;
		}
  };

	$scope.deleteItem = function (Item) {
    var multilinetext = ['Are you sure you want to check-out',' ','Id:' + Item.id,'Type:' + Item.type, 'Desc.:' + Item.description, 'Added:' + Item.entered, 'Use before:' + Item.usebefore ].join("\n");
    var modalOptions = {
      closeButtonText: 'Cancel',
      actionButtonText: 'Check-out',
      headerText: 'Check out ' + Item.id + '?',
      bodyText: multilinetext,
			popup_opened: false,
			itemModal: Item
    };
		var modalDefaults = {
      backdrop: true,
      keyboard: true,
      modalFade: true,
      templateUrl: '/templates/modalRemoveItem.html'
    };
    modalService.showModal(modalDefaults, modalOptions)
      .then(function (result) {
    });
  };

	$scope.additem = {description: ""}

  $scope.openAddItemDialog = function () {
    var uibModalInstance = $uibModal.open({
      templateUrl: '/templates/modalAddItem.html',
      controller: 'AddItemModalInstanceCtrl',
      resolve: {
        items: function () {
          return $scope.items;
        }
      }
    });

    uibModalInstance.result.then(function (data) {
      $scope.additem = data;

			var req_put = $http.put('/inventoryitems/', data);
	    req_put.success(function(data, status, headers) {
	        $scope.inventoryitems = data;
					console.log('OK put: ' + inventoryitems);
	    });
	    req_put.error(function(data, status, headers){
	        console.log('Error: ' + inventoryitems);
	    });
    }, function () {
      console.log('Modal dismissed at: ' + new Date());
    });
  };

	$scope.removeitem = {}

	$scope.openDeleteItemDialog = function (item) {
		var $ctrl = this;
		$ctrl.item = item;
		$scope.itemtoberemoved = item;
		$scope.removeitemdescription = 'hej' + item.id + 'svejs';

		var uibModalInstance = $uibModal.open({
			templateUrl: '/templates/modalRemoveItem.html',
			controller: 'DeleteItemModalInstanceCtrl',
			controllerAs: '$ctrl',
			resolve: {
				item: function () {
					return $ctrl.item;
				}
			}
		});

		uibModalInstance.result.then(function (data) {
		  $scope.removeitem = data;

			var req_delete = $http.delete('/inventoryitems/'+ data.id);
	    req_delete.success(function(inventoryitems) {
        $scope.inventoryitems = inventoryitems;
				console.log('OK delete: ' + inventoryitems);
	    });
	    req_delete.error(function(inventoryitems){
	      console.log('Error: ' + inventoryitems);
	    });

		}, function () {
			console.log('Modal dismissed at: ' + new Date());
		});
	};
}]);

app.controller('AddItemModalInstanceCtrl', function ($scope, $uibModalInstance, items) {
  $scope.ok = function () {
    $uibModalInstance.close($scope.additem);
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('DeleteItemModalInstanceCtrl', function ($scope, $uibModalInstance, item) {
  this.myText = 'Dummy text';
	var $ctrl = this;
	$ctrl.item = item;

  $ctrl.ok = function () {
    $uibModalInstance.close($ctrl.item);
  };

  $ctrl.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
