module.exports = (vemto) => {

    return {
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
                    crud,
                    novaInputs,
                    crudHasTextInputs,
                    crudModelRelationships,
                    getTypeForNova: this.getTypeForNova,
                    getValidationForNova: this.getValidationForNova,
                    getRelationshipModelName: this.getRelationshipModelName,
                    getUpdateValidationForNova: this.getUpdateValidationForNova,
                    fieldName: (fieldName) => this.novaFieldNames(fieldName, crud.model.name)
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
    
            if(input.isCheckbox()) {
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

        beforeRunnerEnd() {
            let projectSettings = vemto.getProject()
        
            vemto.openLink(`${projectSettings.url}/nova`)
        },

        novaFieldNames(novaField, className) {
            let novaFields = [
                'Avatar', 'Badge', 'Boolean', 'BooleanGroup', 'Code', 'Country',
                'Currency', 'Date', 'DateTime', 'File', 'Gravatar', 'Heading', 'Hidden', 'ID',
                'Image', 'KeyValue', 'Markdown', 'Number', 'Password', 'PasswordConfirmation', 'Place', 'Select',
                'Slug', 'Sparkline', 'Status', 'Stack', 'Text', 'Textarea', 'Timezone', 'Trix', 'VaporFile', 'VaporImage',
            ]

            if(novaFields.includes(className) && novaField == className) {
                return `${novaField} as Nova${novaField}`
            }

            return novaField
        }

    }

}