import register from '@kpsys/angularjs-register';
import TouchStartDirective from './touchstart.directive';
import SliderComponent from './slider.component';
import SliderModelComponent from './slider-model.component';

/**
 * @ngdoc module
 * @name td.slider
 * @module td.slider
 *
 * @description
 *
 */

export default register('td.slider')
    .directive(TouchStartDirective.directiveName, TouchStartDirective)
    .component(SliderComponent.componentName, SliderComponent)
    .component(SliderModelComponent.componentName, SliderModelComponent)
    .name();
