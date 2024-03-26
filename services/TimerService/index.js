const cron = require('node-cron')


/**
 * @description 定时专用对象
 */
class TimerTask {
    constructor(taskName ,cronString , onComplete, handler) {
        this.cronString = cronString
        this.onComplete = onComplete
        this.handler = handler
        this.taskName = taskName
    }

    getTaskName(){
        return this.taskName
    }

    getCronString(){
        return this.cronString
    }

    getOnComplete(){
        return this.onComplete
    }

    getHandler(){
        return this.handler
    }

}

class Timer {
    constructor() {
        this.tasks = []
        this.start = this.start.bind(this)
    }
    setTask(taskInfo ){
        this.tasks.push(taskInfo)
    }
    // 启动定时器任务
    start(){
        for(const x in this.tasks){
            console.log("timer start -----", this.tasks[x].taskName)
            let job = cron.schedule( this.tasks[x].cronString, this.tasks[x].handler)
            job.start()
        }
    }
}

const timer = new Timer()


module.exports = {
    TimerTask,
    timer
}