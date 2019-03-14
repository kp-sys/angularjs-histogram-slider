import './slider.less';
import {
    IAttributes,
    IAugmentedJQuery,
    IComponentController,
    IDocumentService,
    INgModelController,
    IOnChanges,
    IOnChangesObject,
    IPostLink,
    IScope
} from 'angular';
import {HORIZONTAL, PERCENT_EMPTY, PERCENT_FULL, VERTICAL} from './slider.constants';
import {SliderModelComponentController} from './slider-model.component';
import LinearAlgorithm from '../slider-algorithms/linear';
import {SliderAlgorithm} from '../slider-algorithms/slider-algorithm.interface';

interface Rect {
    height: number;
    width: number;
    left: number;
    right: number;
    top: number;
}

const HANDLE_SET_EVENT = 'handleSet';

function getHandleFor(event: MouseEvent | TouchEvent) {
    return Number((event.currentTarget as Element).getAttribute('data-handle-key'));
}

function destroyEvent(event: Event) {
    event.stopPropagation();
    event.preventDefault();
}

export abstract class SliderComponentController implements IComponentController, IPostLink, IOnChanges {
    public min: number;
    public max: number;
    public values: number[];
    public orientation: string;
    public algorithm: SliderAlgorithm;
    public snap: boolean;
    public snapPoints: number[];
    public pitStyleCache: Array<{ top?: string, left?: string, position: string }>;
    public pitPoints: number[];
    private ngModelController: INgModelController;
    private document: HTMLDocument;
    private sliderContainer: JQLite;
    private handleNode: Element;
    private handleDimensions: number;
    private handlePositions: number[];
    private slidingIndex: number;
    private sliderModelControllers: SliderModelComponentController[] = [];
    private endSlideListener: () => void;
    private handleMouseSlideListener: (event) => void;
    private handleTouchSlideListener: (event) => void;

    /*@ngInject*/
    constructor($document: IDocumentService, private $attrs: IAttributes, private $scope: IScope) {
        this.document = $document[0];
        this.endSlideListener = () => this.endSlide();
        this.handleMouseSlideListener = (event) => this.handleMouseSlide(event);
        this.handleTouchSlideListener = (event) => this.handleTouchSlide(event);
    }

    public set setHandleNode(value: IAugmentedJQuery) {
        this.handleNode = value[0];
        this.$scope.$emit(HANDLE_SET_EVENT);
    }

    public $postLink(): void {
        this.min = this.min || 1;
        this.max = this.max || 100;
        this.values = this.values || [1];

        if (this.sliderModelControllers.length === 0 && this.ngModelController) {
            this.ngModelController.$render = function ngModelRenderFunction() {
                this.updateValues(this.ngModelController.$viewValue);
            }.bind(this);
        }

        this.orientation = this.orientation || HORIZONTAL;
        this.algorithm = this.algorithm || new LinearAlgorithm();

        this.handlePositions = this.values.map((value) => this.algorithm.getPosition(value, this.min, this.max));
        this.handleDimensions = 0;
        this.slidingIndex = null;

        const unregisterEvent = this.$scope.$on(HANDLE_SET_EVENT, () => {
            if (this.pitPoints) {
                this.fillPitPointsCache();
            }
            unregisterEvent();
        });
    }

    public $onChanges(onChangesObj: IOnChangesObject): void {
        if (onChangesObj.pitPoints && onChangesObj.pitPoints.currentValue && !onChangesObj.pitPoints.isFirstChange()) {
            this.fillPitPointsCache();
        }
    }

    public abstract onClick();

    public abstract onSliderDragStart();

    public abstract onSliderDragMove();

    public abstract onSliderDragEnd();

    public abstract onValuesUpdated(object);

    public abstract getNextHandlePosition(handleIndex: number, percentPosition: number): number;

    public startMouseSlide($event: MouseEvent) {
        this.setStartSlide($event);

        this.document.addEventListener('mouseup', this.endSlideListener, false);
        this.document.addEventListener('mousemove', this.handleMouseSlideListener, false);

        if (this.onSliderDragStart) {
            this.onSliderDragStart();
        }

        destroyEvent($event);
    }

    public startTouchSlide($event) {
        if (($event.originalEvent || $event).changedTouches.length > 1) {
            return;
        }

        this.setStartSlide($event);

        document.addEventListener('touchend', this.endSlideListener, false);
        document.addEventListener('touchmove', this.handleTouchSlideListener, false);

        if (this.onSliderDragStart) {
            this.onSliderDragStart();
        }

        destroyEvent($event);
    }

    public getProgressStyle(idx: number) {
        const value = this.handlePositions[idx];

        if (idx === 0) {
            return this.orientation === VERTICAL
                ? {height: `${value}%`, top: 0}
                : {left: 0, width: `${value}%`};
        }

        const prevValue = this.handlePositions[idx - 1];
        const diffValue = value - prevValue;

        return this.orientation === VERTICAL
            ? {height: `${diffValue}%`, top: `${prevValue}%`}
            : {left: `${prevValue}%`, width: `${diffValue}%`};
    }

    public addHandler(sliderModelController: SliderModelComponentController): number {
        if (!this.sliderModelControllers) {
            this.sliderModelControllers = [sliderModelController];
            this.values = [0];
        } else {
            this.sliderModelControllers.push(sliderModelController);
            this.values.push(0);
        }

        return this.sliderModelControllers.length - 1;
    }

    public updateNewValue(index: number, newValue: number) {
        // Don't update while the slider is sliding or newValues are undefined or null
        if ((this.slidingIndex !== null) || (newValue === undefined || newValue === null)) {
            return;
        }

        const newValues = this.values.slice();
        newValues[index] = newValue;

        this.updateValues(newValues);
    }

    public handleClick(event: MouseEvent) {
        if ((event.target as Element).getAttribute('data-handle-key')) {
            return;
        }

        // Calculate the position of the slider on the page so we can determine
        // the position where you click in relativity.
        const sliderBox = this.getSliderBoundingBox();

        const positionDecimal = this.orientation === VERTICAL
            ? (event.clientY - sliderBox.top) / sliderBox.height
            : (event.clientX - sliderBox.left) / sliderBox.width;

        const positionPercent = positionDecimal * PERCENT_FULL;

        const handleId = this.getClosestHandle(positionPercent);

        const validPositionPercent = this.getSnapPosition(positionPercent);

        // Move the handle there
        this.slideTo(handleId, validPositionPercent, () => this.setModelValue());

        if (this.onClick) {
            this.onClick();
        }
    }

    private updateValues(newValues: number[]) {
        const nextValues = this.validateValues(newValues);

        this.handlePositions = nextValues.map((value) => this.algorithm.getPosition(value, this.min, this.max));
        this.values = nextValues;

        if (this.onValuesUpdated) {
            this.onValuesUpdated({$values: this.values.slice()});
        }
    }

    private setStartSlide(event: MouseEvent | TouchEvent) {
        this.handleDimensions = this.getHandleDimension();
        this.slidingIndex = getHandleFor(event);
    }

    private handleMouseSlide(event: MouseEvent) {
        if (this.slidingIndex === null) {
            return;
        }

        this.handleSlide(event.clientX, event.clientY);
        destroyEvent(event);
    }

    private handleTouchSlide(event: TouchEvent) {
        if (this.slidingIndex === null) {
            return;
        }

        if (event.changedTouches.length > 1) {
            this.endSlide();
            return;
        }

        const touch = event.changedTouches[0];

        this.handleSlide(touch.clientX, touch.clientY);
        destroyEvent(event);
    }

    private handleSlide(x: number, y: number) {
        const sliderBox = this.getSliderBoundingBox();
        const positionPercent = this.positionPercent(x, y, sliderBox);

        this.slideTo(this.slidingIndex, positionPercent);

        if (this.canMove(this.slidingIndex, positionPercent)) {
            if (this.onSliderDragMove) {
                this.onSliderDragMove();
            }
        }
    }

    private slideTo(idx: number, proposedPosition: number, onAfterSet?: () => any) {
        const actualPosition = this.validatePosition(idx, proposedPosition);

        this.handlePositions = this.handlePositions.map((pos, index) => (
            index === idx ? actualPosition : pos
        ));

        this.values = this.handlePositions.map((pos) => this.algorithm.getValue(pos, this.min, this.max));

        this.$scope.$applyAsync();

        if (this.onValuesUpdated) {
            this.onValuesUpdated({$values: this.values.slice()});
        }

        if (onAfterSet) {
            onAfterSet();
        }
    }

    private endSlide() {
        document.removeEventListener('mouseup', this.endSlideListener, false);
        document.removeEventListener('mousemove', this.handleMouseSlideListener, false);

        document.removeEventListener('touchend', this.endSlideListener, false);
        document.removeEventListener('touchmove', this.handleMouseSlideListener, false);

        if (this.onSliderDragEnd) {
            this.onSliderDragEnd();
        }
        if (this.snap) {
            const positionPercent = this.getSnapPosition(this.handlePositions[this.slidingIndex]);
            this.slideTo(this.slidingIndex, positionPercent, () => this.setModelValue());
        } else {
            this.setModelValue();
        }

        this.slidingIndex = null;
    }

    private getClosestHandle(positionPercent: number): number {
        return this.handlePositions.reduce((closestIdx, node, idx) => {
            const challenger = Math.abs(this.handlePositions[idx] - positionPercent);
            const current = Math.abs(this.handlePositions[closestIdx] - positionPercent);

            return challenger < current ? idx : closestIdx;
        }, 0);
    }

    private getSliderBoundingBox(): Rect {
        const rect = this.sliderContainer[0].getBoundingClientRect();
        return {
            height: rect.height || this.sliderContainer[0].clientHeight,
            width: rect.width || this.sliderContainer[0].clientWidth,
            left: rect.left,
            right: rect.right,
            top: rect.top
        };
    }

    private getSnapPosition(positionPercent: number): number {
        if (!this.snap) {
            return positionPercent;
        }

        const value = this.algorithm.getValue(positionPercent, this.min, this.max);
        const snapValue = this.getClosestSnapPoint(value);

        return this.algorithm.getPosition(snapValue, this.min, this.max);
    }

    private getClosestSnapPoint(value) {
        if (!this.snapPoints || !this.snapPoints.length) {
            return value;
        }

        return this.snapPoints.reduce((snapTo, snap) =>
            Math.abs(snapTo - value) < Math.abs(snap - value) ? snapTo : snap
        );
    }

    private positionPercent(x: number, y: number, sliderBox: Rect): number {
        if (this.orientation === VERTICAL) {
            return ((y - sliderBox.top) / sliderBox.height) * PERCENT_FULL;
        }
        return ((x - sliderBox.left) / sliderBox.width) * PERCENT_FULL;
    }

    /**
     * Can we move the slider to the given position?
     * @param idx
     * @param proposedPosition
     */
    private canMove(idx: number, proposedPosition: number): boolean {
        const sliderBox = this.getSliderBoundingBox();

        const handlePercentage = this.orientation === VERTICAL
            ? ((this.handleDimensions / sliderBox.height) * PERCENT_FULL) / 2
            : ((this.handleDimensions / sliderBox.width) * PERCENT_FULL) / 2;

        if (proposedPosition < PERCENT_EMPTY) {
            return false;
        }
        if (proposedPosition > PERCENT_FULL) {
            return false;
        }

        const nextHandlePosition = this.handlePositions[idx + 1] !== undefined
            ? this.handlePositions[idx + 1] - handlePercentage
            : Infinity;

        if (proposedPosition > nextHandlePosition) {
            return false;
        }

        const prevHandlePosition = this.handlePositions[idx - 1] !== undefined
            ? this.handlePositions[idx - 1] + handlePercentage
            : -Infinity;

        return proposedPosition >= prevHandlePosition;
    }

    private getHandleDimension(): number {
        if (!this.handleNode) {
            return 0;
        }

        return this.orientation === VERTICAL
            ? this.handleNode.clientHeight
            : this.handleNode.clientWidth;
    }

    /**
     * Make sure the proposed position respects the bounds and does not collide with other handles too much.
     * @param idx
     * @param proposedPosition
     */
    private validatePosition(idx: number, proposedPosition: number): number {
        const nextPosition = this.userAdjustPosition(idx, proposedPosition);
        const sliderBox = this.getSliderBoundingBox();

        const handlePercentage = this.orientation === VERTICAL
            ? ((this.handleDimensions / sliderBox.height) * PERCENT_FULL) / 2
            : ((this.handleDimensions / sliderBox.width) * PERCENT_FULL) / 2;

        return Math.max(
            Math.min(
                nextPosition,
                this.handlePositions[idx + 1] !== undefined
                    ? this.handlePositions[idx + 1] // - handlePercentage = kolik % zabira handle
                    : PERCENT_FULL, // 100% is the highest value
            ),
            this.handlePositions[idx - 1] !== undefined
                ? this.handlePositions[idx - 1] // + handlePercentage
                : PERCENT_EMPTY, // 0% is the lowest value
        );
    }

    private validateValues(proposedValues: number[]): number[] {
        return proposedValues.map((value, idx, values) => {
            const realValue = Math.max(Math.min(value, this.max), this.min);

            if (values.length && realValue < values[idx - 1]) {
                return values[idx - 1];
            }

            return realValue;
        });
    }

    /**
     * Apply user adjustments to position
     * @param idx
     * @param proposedPosition
     */
    private userAdjustPosition(idx: number, proposedPosition: number): number {

        let nextPosition = proposedPosition;
        if (this.getNextHandlePosition) {
            nextPosition = this.getNextHandlePosition(idx, proposedPosition);

            if (
                isNaN(nextPosition)
                || nextPosition < PERCENT_EMPTY
                || nextPosition > PERCENT_FULL
            ) {
                throw new TypeError('getNextHandlePosition returned invalid position. Valid positions are floats between 0 and 100');
            }
        }

        return nextPosition;
    }

    private setModelValue() {
        this.ngModelController.$setViewValue(this.values);
    }

    private fillPitPointsCache() {
        this.pitStyleCache = this.pitPoints.map((point) => {
            const position = this.algorithm.getPosition(point, this.min, this.max);

            return this.orientation === VERTICAL
                ? {top: `${position}%`, left: `${this.getHandleDimension() / 2}px`, position: 'absolute'}
                : {left: `${position}%`, top: `${this.getHandleDimension() / 2}px`, position: 'absolute'};
        });
    }
}

/**
 * @ngdoc component
 * @name td-slider
 * @module td.slider
 *
 * @requires {ngModelController}
 *
 * @param {number=} min Slider minimum value.
 * @param {number=} max Slider maximum value.
 * @param {string=} orientation Possible values are 'HORIZONTAL' or 'VERTICAL'.
 * @param {SliderAlgorithm=} algorithm The algorithm, by default linear, the slider will use. Feel free to write your own as long as it conforms to the shape.
 * @param {boolean=} snap Controls the slider's snapping behavior.
 * @param {number[]=} snapPoints An array of values on the slider where the slider should snap to.
 * @param {number[]=} pitPoints As the set of points at which it will render a pit. Points are an array of values on the slider.
 * @param {expression=} ngChange NgChange hook.
 *
 * @param {function()=} onSliderDragStart
 * @param {function()=} onSliderDragMove
 * @param {function()=} onSliderDragEnd
 * @param {function($values: number[])=} onValuesUpdated
 * @param {function()=} onAfterSet
 * @param {function(handleIndex: number, percentPosition: number)=} getNextHandlePosition If you need to perform custom logic to postprocess the handle position, getNextHandlePosition accepts a callback of the form `(handleIdx: number, percentPosition: number) => number`.
 *                                                                                          Return the updated handle position. This is useful if you need to customize ranges within a single slider.
 */
// tslint:disable-next-line
export default class SliderComponent {
    public static componentName = 'tdSlider';

    public templateUrl = require('./slider.tpl.pug');
    public controller = SliderComponentController;
    public transclude = true;

    public require = {
        ngModelController: '?ngModel'
    };

    public bindings = {
        min: '<?',
        max: '<?',
        orientation: '@?',
        algorithm: '<?',
        snap: '<?',
        snapPoints: '<?',
        pitPoints: '<?',

        onClick: '&?',
        onSliderDragStart: '&?',
        onSliderDragMove: '&?',
        onSliderDragEnd: '&?',
        onValuesUpdated: '&?',
        onAfterSet: '&?',
        getNextHandlePosition: '&?'
    };
}
