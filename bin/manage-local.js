#!/usr/bin/env node

/**
 * A small program to manage local providers and users.
 */

const inquirer = require("inquirer")
const bcrypt = require("bcryptjs")
const fs = require("fs")
let providersFile = "./providers.json"
let providers = JSON.parse(fs.readFileSync(providersFile, { encoding: "utf-8" }))

console.log("Login Server local user management")
console.log("Important Note: Do not manually edit providers.json while this script is running. Any action here will override those changes!")

// TODO: - Save providers to providers.json

function loop(mode = "start", data = {}, prompt, action = null) {
  prompt = prompt || Promise.resolve(null)
  prompt.then(answer => {
    let provider = providers.find(provider => provider.id === data.provider)
    console.log()
    if (action != null) {
      switch (action) {
      case "chooseProvider":
        if (answer.provider == "New Local Provider") {
          mode = "newProvider"
        } else {
          data.provider = answer.provider
        }
        break
      case "createProvider":
        answer.strategy = "local"
        answer.credentialsNecessary = true
        answer.options = { users: [] }
        providers.push(answer)
        data.provider = answer.id
        console.log(`Created provider with ID ${answer.id}!`)
        console.log()
        break
      case "createUser":
        answer.password = bcrypt.hashSync(answer.password, 10)
        provider.options.users.push(answer)
        console.log(`Created user with username ${answer.username}!`)
        console.log()
        break
      case "deleteProvider":
        providers = providers.filter(provider => provider.id != data.provider)
        break
      case "deleteUser":
        provider.options.users = provider.options.users.filter(user => user.username != data.user)
        delete data.user
        break
      default:
        console.warn(`Unknown action ${action}.`)
      }
    }
    // After action, write current providers to file
    fs.writeFileSync(providersFile, JSON.stringify(providers, null, 2))
    // data.provider has potentially changed, reread provider
    provider = providers.find(provider => provider.id === data.provider)
    if (provider) {
      console.log(`Selected provider: ${provider.id} (${provider.options.users.length} existing users)`)
    }
    switch (mode) {
    case "start":
      prompt = inquirer.prompt([{
        type: "list",
        name: "provider",
        message: "Choose a local provider",
        choices: providers.filter(provider => provider.strategy == "local").map(provider => provider.id).concat([new inquirer.Separator(), "New Local Provider"])
      }])
      loop("action", data, prompt, "chooseProvider")
      break
    case "newProvider":
      prompt = inquirer.prompt([
        {
          type: "input",
          name: "id",
          message: "ID:",
          validate: (value) => {
            let valid = providers.find(provider => provider.id == value) == null && value.length != 0
            return valid || `Provider with ID ${value} already exists!`
          },
        },
        {
          type: "input",
          name: "name",
          message: "Name:",
          validate: (value) => {
            let valid = value.length != 0
            return valid || "Provider must have a name"
          },
        },
      ])
      loop("action", data, prompt, "createProvider")
      break
    case "action":
      prompt = inquirer.prompt([{
        type: "list",
        name: "action",
        message: "Choose an action",
        choices: ["Create new user", "Choose different provider", new inquirer.Separator(), "Delete a user", "Delete provider"]
      }]).then(answer => {
        switch (answer.action) {
        case "Choose different provider":
          data.provider = null
          loop("start", data, null, null)
          break
        case "Create new user":
          loop("newUser", data, null, null)
          break
        case "Delete a user":
          inquirer.prompt([{
            type: "list",
            name: "user",
            message: "Which user do you want to delete?",
            choices: provider.options.users.map(user => user.username).concat([{ name: "go back", value: null }])
          }]).then(({user}) => {
            if (user) {
              data.user = user
              loop("action", data, null, "deleteUser")
            } else {
              loop("action", data, null, null)
            }
          })
          break
        case "Delete provider":
          inquirer.prompt([{
            type: "confirm",
            name: "really",
            message: `Do you really want to delete provider ${provider.id}?`,
            default: false
          }]).then(({ really }) => {
            if (really) {
              loop("start", data, null, "deleteProvider")
            } else {
              loop("action", data, null, null)
            }
          })
        }
      })
      break
    case "newUser":
      prompt = inquirer.prompt([
        {
          type: "input",
          name: "username",
          message: "Username:",
          validate: (value) => {
            let valid = provider.options.users.find(user => user.username == value) == null && value.length != 0
            return valid || `User with username ${value} already exists!`
          },
        },
        {
          type: "input",
          name: "uri",
          message: "URI:",
          validate: (value) => {
            let valid = provider.options.users.find(user => user.uri == value) == null && value.length != 0
            return valid || `User with URI ${value} already exists!`
          },
        },
        {
          type: "input",
          name: "displayName",
          message: "Display Name:",
          validate: (value) => {
            let valid = value.length != 0
            return valid || "User must have a name"
          },
        },
        {
          type: "password",
          name: "password",
          message: "Password:",
          validate: (value) => {
            let valid = value.length > 7
            return valid || "Password muyt have at least 8 characters"
          },
        },
      ])
      loop("action", data, prompt, "createUser")
      break
    default:
      console.warn(`Unknown mode ${mode}, returning to start.`)
      loop()
    }
  })
}

loop()
