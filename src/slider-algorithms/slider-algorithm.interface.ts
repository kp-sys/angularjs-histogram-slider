export interface SliderAlgorithm {
    /**
     * Return percentage position os anchor
     * @param value Real value
     * @param min
     * @param max
     */
    getPosition(value: number, min: number, max: number): number;

    /**
     * Return real value from position
     * @param pos Percentage position of anchor
     * @param min
     * @param max
     */
    getValue(pos: number, min: number, max: number): number;
}
