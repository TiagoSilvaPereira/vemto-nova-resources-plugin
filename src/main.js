module.exports = (vemto) => {

    return {
        canInstall() {
            let appVersion = vemto.project.version,
                compareOptions = {
                    numeric: false,
                    sensitivity: 'base'
                }

            if(appVersion.localeCompare("1.0.4", undefined, compareOptions) < 0) {
                vemto.addBlockReason('You have a smaller version than recommended to use the plugin')
                return false
            }

            return true
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
                let crudData = { 'selected': true, 'inputs': true, 'relationships': [] },
                    crudRelationships = this.getAllRelationshipsFromModel(crud.model)

                if(crudRelationships.length) {
                    crudRelationships.forEach(rel => {
                        crudData.relationships[rel.id] = true
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

        crudsSelectedForNova() {
            let pluginData = vemto.getPluginData(),
                hasCrudForGenerate = pluginData.cruds.find(crud => crud && crud.selected)

            if(!hasCrudForGenerate) {
                vemto.log.warning('No have a selected CRUD for generate a Nova Resource.')
                return []
            }

            return pluginData.cruds
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

                let novaInputs = this.getInputsForNova(crud),
                    crudHasTextInputs = this.crudHasTextInputs(crud),
                    crudModelRelationships = this.getAllRelationshipsFromModel(crud.model)

                options.data = {
                    crud, novaInputs,
                    crudHasTextInputs,
                    crudModelRelationships,
                    getTypeForNova: (input) => this.getTypeForNova(input, crud.model.name),
                    getValidationForNova: this.getValidationForNova,
                    getRelationshipModelName: this.getRelationshipModelName,
                    getUpdateValidationForNova: this.getUpdateValidationForNova,
                    fieldName: (fieldName) => this.novaFieldNames(fieldName, crud.model.name),

                    modules: [
                        {name: 'crud', id: crud.id},
                        {name: 'crud-settings', id: crud.id}
                    ]
                }

                vemto.renderTemplate('files/NovaResource.vemtl', `${basePath}/${crud.model.name}.php`, options)
            })
        },

        getTypeForNova(input, className) {
            let textInputs = ['Email', 'Url', 'Text'],
                inputTypePascalCase = input.type.case('pascalCase'),
                inputTypeForNova = ''

            if(textInputs.includes(inputTypePascalCase)) {
                inputTypeForNova = 'Text'
            }
    
            if(input.isCheckbox() && !inputTypeForNova.length) {
                inputTypeForNova = 'Boolean'
            }

            let novaFieldNames = this.getNovaFieldNames(),
                inputType = inputTypeForNova.length ? inputTypeForNova : inputTypePascalCase
    
            return novaFieldNames.includes(inputType) && inputType == className
                    ? `Nova${inputType}` : inputType
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

        beforeRunnerEnd() {
            let projectSettings = vemto.getProject()
        
            vemto.openLink(`${projectSettings.url}/nova`)
        },

        novaFieldNames(novaField, className) {
            let novaFields = this.getNovaFieldNames()

            if(novaFields.includes(className) && novaField == className) {
                return `${novaField} as Nova${novaField}`
            }

            return novaField
        },

        getNovaFieldNames() {
            return [
                'Avatar', 'Badge', 'Boolean', 'BooleanGroup', 'Code', 'Country',
                'Currency', 'Date', 'DateTime', 'File', 'Gravatar', 'Heading', 'Hidden', 'ID',
                'Image', 'KeyValue', 'Markdown', 'Number', 'Password', 'PasswordConfirmation', 'Place', 'Select',
                'Slug', 'Sparkline', 'Status', 'Stack', 'Text', 'Textarea', 'Timezone', 'Trix', 'VaporFile', 'VaporImage',
            ]
        }

    }

}