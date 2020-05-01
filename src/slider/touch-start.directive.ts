import {IAttributes, IAugmentedJQuery, IParseService, IScope} from 'angular';

/**
 * @ngdoc directive
 * @name touchStart
 * @module td.slider
 *
 * @param {function} touchStart Method to invoke on touchstart event
 * @param {event} touchStart.$event Source event.
 *
 * @description
 *
 */
export default class TouchStartDirective {

    public static directiveName = 'touchStart';

    public restrict = 'A';

    /*@ngInject*/
    constructor(private $parse: IParseService) {
    }

    public link($scope: IScope, $element: IAugmentedJQuery, $attrs: IAttributes) {
        const onTouchStart = ($event) => {
            this.$parse($attrs[TouchStartDirective.directiveName])($scope, {$event});
        }

        $element.on('touchstart', onTouchStart);

        $scope.$on('$destroy', () => $element.off('touchstart', onTouchStart));
    }
}
