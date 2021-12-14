<template>
    <div class="w-full">
        <label class="block text-sm font-bold">Laravel Nova Plugin</label>
        <small class="mb-2">Select the CRUDs to generate a Laravel Nova Resource</small>
        
        <div class="mt-5">
            <label class="block text-sm font-bold mb-2">Project CRUDs</label>

            <div class="form-check mb-3">
                <input class="form-check-input appearance-none border border-gray-300 mr-2 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 cursor-pointer" type="checkbox" id="selectAllCruds" @change="selectAllCruds">
                <label class="form-check-label inline-block text-gray-800 mt-1" for="selectAllCruds">
                    Select All
                </label>
            </div>
            
            <div class="form-check" v-for="crud in cruds" :key="crud.id">
                <input class="form-check-input appearance-none border border-gray-300 mr-2 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 cursor-pointer" type="checkbox" v-model="selectedCruds[crud.id]" :id="crud.id" @change="save">
                <label class="form-check-label inline-block text-gray-800 mt-1" :for="crud.id">
                    {{ crud.name }}
                </label>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    data() {
        return {
            cruds: [],
            pluginData: {},
            selectedCruds: [],
        }
    },

    created() {
        this.cruds = window.vemtoApi.getProject().getMainCruds()
        this.pluginData = window.vemtoApi.getPluginData()

        this.loadCruds()
    },

    methods: {
        loadCruds() {
            let pluginDataCruds = this.pluginData.cruds

            if(!pluginDataCruds.length) return
            
            this.cruds.forEach(crud => {
                if(pluginDataCruds[crud.id]) {
                    this.selectCrud(crud)
                }
            })
        },

        selectAllCruds(event) {
            let isChecked = event.target.checked

            if(isChecked) {
                this.cruds.forEach(crud => this.selectCrud(crud))
            } else {
                this.selectedCruds = {}
            }

            this.save()
        },

        selectCrud(crud) {
            this.$set(this.selectedCruds, crud.id, true)
        },

        save: window.vemtoApi.debounce(function() {
            window.vemtoApi.savePluginData({
                cruds: this.selectedCruds
            })
        }, 300)
    }
}
</script>