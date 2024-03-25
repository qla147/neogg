const cron = require('node-cron')




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
            console.log("start -----", this.tasks[x].taskName)
            let job = cron.schedule( this.tasks[x].cronString, this.tasks[x].handler)
                // onComplete: this.tasks[x].onComplete,
                // start: true
            // })

            job.start()
            // console.log(job.cronTime)
        }
    }
}

const timer = new Timer()


module.exports = {
    TimerTask,
    timer
}