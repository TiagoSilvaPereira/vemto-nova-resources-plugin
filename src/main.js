module.exports = (vemto) => {

    return {
        crudRepository: [],
        
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
            let projectCruds = vemto.getProject().getMainCruds()

            vemto.savePluginData({
                cruds: this.generateCrudsData(projectCruds)
            })
        },

        generateCrudsData(cruds) {
            let crudsData = []

                cruds.forEach(crud => {
                let crudData = { 'selected': true, 'id': crud.id, 'inputs': true, 'relationships': [] },
                    crudRelationships = this.getAllRelationshipsFromModel(crud.model)

                if(crudRelationships.length) {
                    crudRelationships.forEach(rel => {
                        crudData.relationships[rel.id] = { 'selected': true }
                    })
                }

                crudsData[crud.id] = crudData
            })
            
            return crudsData.map(crud => crud)
        },

        beforeCodeGenerationEnd() {
            let selectedCruds = this.crudsSelectedForNova()

            if(!selectedCruds.length) return

            this.addSelectedCrudsToRepository(selectedCruds)

            this.crudRepository.forEach(crud => {
                this.resolveCrudRelationships(crud)
            })

            this.generateNovaFiles()
        },

        crudsSelectedForNova() {
            let pluginData = vemto.getPluginData(),
                hasCrudForGeneration = pluginData.cruds.find(crud => crud && crud.selected)

            if(!hasCrudForGeneration) {
                vemto.log.warning('No have a selected CRUD for generate a Nova Resource.')
                return []
            }

            return pluginData.cruds.filter(crud => crud && crud.selected)
        },

        addSelectedCrudsToRepository(cruds) {
            let projectCruds = vemto.getProject().getMainCruds()

            cruds.forEach(crud => {
                let crudData = projectCruds.find(projectCrud => projectCrud.id === crud.id)

                crudData = this.generatePluginConfigForCrud(crudData, crud.inputs, crud.relationships, false)

                this.crudRepository.push(crudData)
            })
        },

        resolveCrudRelationships(crud, ignorePluginConfig = false) {
            let relationships = this.getAllRelationshipsFromModel(crud.model)

            relationships.forEach(rel => {
                let crudRelationshipData = crud.pluginConfig.relationships && crud.pluginConfig.relationships[rel.id]

                if(!ignorePluginConfig && (!crudRelationshipData || !crudRelationshipData.selected)) return

                let relModelCrud = rel.model.cruds[0],
                    crudModelExistsOnRepository = this.crudRepository.find(crud => crud.model.id === rel.model.id)

                if(crudModelExistsOnRepository) return

                if(!relModelCrud) {
                    relModelCrud = vemto.createFakeCrudFromModel(rel.model)
                }

                relModelCrud = this.generatePluginConfigForCrud(relModelCrud, true, {}, true)

                this.crudRepository.push(relModelCrud)

                this.resolveCrudRelationships(relModelCrud, true)
            })
        },

        generatePluginConfigForCrud(crud, inputs, relationships, isMasterDetail = false) {
            if(!crud.pluginConfig) {
                crud.pluginConfig = {}
            }

            crud.pluginConfig.inputs = inputs
            crud.pluginConfig.relationships = relationships

            if(isMasterDetail) {
                crud.pluginConfig.isMasterDetail = true
            } else {
                crud.pluginConfig.isSelectedCrud = true
            }

            return crud
        },

        generateNovaFiles() {
            let basePath = 'app/Nova',
                options = {
                    formatAs: 'php',
                    data: {}
                }
                
            vemto.log.message('Generating Nova Resources...')

            this.crudRepository.forEach(crud => {
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
                    fieldClassName: (fieldName) => this.getNovaFieldClassName(fieldName, crud.model.name),
                }

                options.modules = [
                    { name: 'crud', id: crud.id },
                    { name: 'crud-settings', id: crud.id }
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