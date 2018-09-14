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
 * @name sliderModel
 * @module slider
 *
 * @requires {ngModel}
 * @requires {^slider}
 */
// tslint:disable-next-line
export default class SliderModelComponent {
    public static componentName = 'sliderModel';

    public require = {
        ngModelController: 'ngModel',
        histogramSliderController: `^${SliderComponent.componentName}`
    };

    public controller = SliderModelComponentController;
}
