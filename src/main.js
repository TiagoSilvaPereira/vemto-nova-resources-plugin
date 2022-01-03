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

            let [crudsWithMasterDetailRelationships, masterDetailCruds] = this.resolveCrudRelationships(selectedCruds)

            this.generateNovaFiles(crudsWithMasterDetailRelationships, masterDetailCruds)
        },

        resolveCrudRelationships(cruds) {
            let pluginData = vemto.getPluginData(),
                projectCruds = vemto.getProject().getMainCruds(),
                masterDetailCruds = []

            cruds.forEach(crudId => {
                let crud = projectCruds.find(crud => crud.id == crudId),
                    crudPluginData = pluginData.cruds[crudId]

                if(!crud || !crudPluginData) return

                let crudRelationships = this.getAllRelationshipsFromModel(crud.model)

                crudRelationships.forEach(relationship => {
                    let crudRelationship = relationship.model.cruds[0]

                    if(!crudPluginData.relationships[relationship.id] || !crudRelationship) return

                    if(pluginData.cruds[crudRelationship.id] && pluginData.cruds[crudRelationship.id].selected) return
                    
                    if(masterDetailCruds.includes(crudRelationship.id)) return
                    
                    masterDetailCruds.push(crudRelationship.id)
                })
            })

            cruds = cruds.concat(masterDetailCruds)

            return [cruds, masterDetailCruds]
        },

        crudsSelectedForNova() {
            let pluginData = vemto.getPluginData(),
                hasCrudForGeneration = pluginData.cruds.find(crud => crud && crud.selected)

            if(!hasCrudForGeneration) {
                vemto.log.warning('No have a selected CRUD for generate a Nova Resource.')
                return []
            }

            return pluginData.cruds
        },

        generateNovaFiles(selectedCruds, masterDetailCruds) {
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
                    crudModelRelationships = this.getAllRelationshipsFromModel(crud.model),
                    isCrudForMasterDetail = masterDetailCruds.includes(crudId)

                options.data = {
                    crud, novaInputs,
                    crudHasTextInputs,
                    isCrudForMasterDetail,
                    crudModelRelationships,
                    getTypeForNova: (input) => this.getTypeForNova(input, crud.model.name),
                    getValidationForNova: this.getValidationForNova,
                    getRelationshipModelName: this.getRelationshipModelName,
                    getUpdateValidationForNova: this.getUpdateValidationForNova,
                    fieldClassName: (fieldName) => this.getNovaFieldClassName(fieldName, crud.model.name),
                }

                options.modules = [
                    { name: 'crud', id: crudId },
                    { name: 'crud-settings', id: crudId }
                ]

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

        getNovaFieldClassName(novaField, className) {
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