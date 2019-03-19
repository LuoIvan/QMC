<template>
  <div class="jira">
    <DateSelector @dateConfirm="updateTable">
      <i class="el-icon-loading" style="margin-left:20px" @click="downloadJira" slot="extra"
         v-if="isJiraDownloading"> </i>
      <i class="el-icon-download" style="margin-left:20px" @click="downloadJira" slot="extra" v-else> </i>
    </DateSelector>


    <el-table :data="jiraList" stripe style="width: 100%" @cell-click="cellClick" empty-text="Loading...">

      <el-table-column prop="title" label="Subject"></el-table-column>
      <el-table-column prop="priority" label="Priority" width="180"></el-table-column>
      <el-table-column prop="reporter" label="Reporter" width="180"></el-table-column>
      <el-table-column prop="type" label="type" width="180"
                       :filters="[{ text: 'Task', value: 0 },
                                    { text: 'SubTask', value: 1 },
                                    { text: 'Bug', value:2 }]"
                       :filter-method="filterType"></el-table-column>
      <el-table-column label="Updated" width="180">
        <template slot-scope="scope">
          {{getTimeDiff(scope.row.updated)}}
        </template>
      </el-table-column>

    </el-table>
  </div>

</template>

<script>
  import {timeSince} from "@/common/js/dateUtil";
  import {getTimeDifferInDay} from "@/common/js/dateUtil";
  import DateSelector from "../CommonComponents/DateSelector";

  export default {
    name: "Jira",
    components: {DateSelector},
    data() {
      return {
        jiraList: [],
        dayStart: 7,
        dayEnd: 0,
        isJiraDownloading: false,

      }
    },
    mounted: function () {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
      this.dateRange = [start, end];
    },
    methods: {
      clearList() {
        this.jiraList = []

      },
      updateTable(dateRange) {

        this.clearList();
        this.dayStart = getTimeDifferInDay(dateRange[0]);
        this.dayEnd = getTimeDifferInDay(dateRange[1]);
        this.jiraClicked(this.dayStart, this.dayEnd);


      },
      downloadJira() {
        this.isJiraDownloading = true;
        this.$axios.get(`/api/jira?type=csv&dayStart=${this.dayStart}&dayEnd=${this.dayEnd}`, {responseType: 'blob'})
          .then(response => {
            let url = URL.createObjectURL(response.data);
            let link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.setAttribute('download', 'jira.csv');
            document.body.appendChild(link);
            link.click();
            this.isJiraDownloading = false;
          });
      },

      jiraClicked() {
        this.$axios.get(`/api/jira?dayStart=${this.dayStart}&dayEnd=${this.dayEnd}`)
          .then(response => {
            this.jiraList = response.data
          });
      },
      getTimeDiff: function (timeStr, flag) {
        return timeSince(Date.parse(timeStr + (flag ? " GMT" : "")))
      },
      filterType(value, row) {
        switch (value) {
          case 0:
            return row.type === "Task";
          case 1:
            return row.type === "Sub-task";
          case 2:
            return row.type === "Bug";

        }
      }
    }
  }
</script>

<style scoped>
  .el-icon-arrow-right, .el-icon-download {
    cursor: pointer;
    padding: 5px;
    margin-left: 10px
  }

  .el-icon-arrow-right:hover, .el-icon-download:hover {
    color: deepskyblue;
  }

  .jira {
    margin: 10px 0 0 0
  }
</style>
