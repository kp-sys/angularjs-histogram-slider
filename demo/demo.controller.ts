export default class DemoController {
    public sliderModel = [20, 30];

    /*@ngInject*/
    constructor(private $log) {
        //
    }

    public change() {
        this.$log.log('Value changed');
    }
}
