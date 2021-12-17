module.exports = (vemto) => {

    return {
        crudsSelectedForNova() {
            let pluginData = vemto.getPluginData(),
                hasCrudForGenerate = pluginData.cruds.find(crud => crud && crud.selected)

            if(!hasCrudForGenerate) {
                vemto.log.error('Select a CRUD on the plugin page for generating a Nova Resource')
                return []
            }

            return pluginData.cruds
        },

        onInstall() {
            vemto.savePluginData({
                cruds: this.generateCrudsData()
            })
        },

        generateCrudsData() {
            let projectCruds = vemto.getProject().getMainCruds(),
                crudsData = []

            projectCruds.forEach(crud => {
                let crudData = { 'selected': false, 'inputs': false, 'relationships': [] },
                    crudRelationships = this.getAllRelationshipsFromModel(crud.model)

                if(crudRelationships.length) {
                    crudRelationships.forEach(rel => {
                        crudData.relationships[rel.id] = false
                    })
                }

                crudsData[crud.id] = crudData
            })
            
            return crudsData.map(crud => crud)
        },

        beforeCodeGenerationEnd() {
            let selectedCruds = this.crudsSelectedForNova()

            if(!selectedCruds.length) return

            selectedCruds = Object.keys(selectedCruds).filter(crud => selectedCruds[crud] && selectedCruds[crud].selected)

            this.generateNovaFiles(selectedCruds)
        },

        generateNovaFiles(selectedCruds) {
            let basePath = 'app/Nova',
                options = {
                    formatAs: 'php',
                    data: {}
                }
                
            vemto.log.message('Generating Nova Resources...')

            let projectCruds = vemto.getProject().getMainCruds()

            selectedCruds.forEach(crudId => {
                let crud = projectCruds.find(crud => crud.id == crudId)

                if(!crud) return

                options.data = {
                    crud,
                    getTypeForNova: this.getTypeForNova,
                    getInputsForNova: this.getInputsForNova,
                    crudHasTextInputs: this.crudHasTextInputs,
                    getValidationForNova: this.getValidationForNova,
                    getRelationshipModelName: this.getRelationshipModelName,
                    getUpdateValidationForNova: this.getUpdateValidationForNova,
                    getAllRelationshipsFromModel: this.getAllRelationshipsFromModel,
                }

                vemto.renderTemplate('files/NovaResource.vemtl', `${basePath}/${crud.model.name}.php`, options)
            })
        },

        getTypeForNova(input) {
            let textInputs = ['email', 'url']

            if(textInputs.includes(input.type)) {
                return 'Text'
            }
    
            if(input.isForRelationship()) {
                return 'BelongsTo'
            }
    
            if(input.type == 'checkbox') {
                return 'Boolean'
            }
    
            return input.type.case('pascalCase')
        },

        crudHasTextInputs(crud){
            return crud.hasTextInputs() || crud.hasEmailInputs() || crud.hasUrlInputs()
        },

        getValidationForNova(input) {
            let validation = input.convertValidationToTextForTemplate(input.validation)
            
            return validation.replace(/\|/g, '\', \'')
        },

        getUpdateValidationForNova(input) {
            let updateValidation = input.convertValidationToTextForTemplate(input.updateValidation)

            return updateValidation
                .replace(/\|/g, '\', \'')
                .replace(
                    `'unique:${input.crud.model.table},${input.name}'`,
                    `'unique:${input.crud.model.table},${input.name},{{resourceId}}'`)
        },

        getInputsForNova(crud) {
            return crud.inputs.filter(input => !input.isForRelationship())
        },

        getAllRelationshipsFromModel(model) {
            let basicRelationships = model.getAllRelationships(),
                morphRelationships = model.getAllMorphRelationships()

            return [].concat(
                basicRelationships, morphRelationships
            )
        },

        getRelationshipModelName(relationship) {
            let relWithPluralModelName = ['belongsToMany', 'morphMany', 'morphToMany', 'hasMany']

            if(relWithPluralModelName.includes(relationship.type)) {
                return relationship.model.plural
            }

            return relationship.model.name
        },

        beforeRunnerStart() {
            let projectSettings = vemto.getProject()
        
            vemto.openLink(`${projectSettings.url}/nova`)
        },

    }

}