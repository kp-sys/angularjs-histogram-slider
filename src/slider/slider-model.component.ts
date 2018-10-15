import SliderComponent, {SliderComponentController} from './slider.component';
import {INgModelController, IPostLink} from 'angular';

export class SliderModelComponentController implements IPostLink {
    public ngModelController: INgModelController;

    private histogramSliderController: SliderComponentController;
    private handlerIndex: number;

    public $postLink() {
        this.handlerIndex = this.histogramSliderController.addHandler(this);

        this.ngModelController.$render = () => {
            this.histogramSliderController.updateNewValue(this.handlerIndex, this.ngModelController.$modelValue);
        };
    }
}

/**
 * @ngdoc component
 * @name tdSliderModel
 * @module td.slider
 *
 * @requires {ngModel}
 * @requires {^tdSlider}
 */
// tslint:disable-next-line
export default class SliderModelComponent {
    public static componentName = 'tdSliderModel';

    public require = {
        ngModelController: 'ngModel',
        histogramSliderController: `^${SliderComponent.componentName}`
    };

    public controller = SliderModelComponentController;
}
