<template>
  <template v-for="(node, _index) in components[rootComponent].nodes" :key="_index">
    <Renderer :node="node" />
  </template>
</template>

<script setup lang="ts">
import { ref, defineComponent, h, resolveDynamicComponent, computed, getCurrentInstance, type RendererElement, type RendererNode, type VNode } from 'vue'
import AppFrame from './FabricateIncludes/AppFrame.vue'
import PlayerFrame from './FabricateIncludes/PlayerFrame.vue'
import PlayersContainer from './FabricateIncludes/PlayersContainer.vue'
import { useTimer } from '../composables/useTimer'

const componentsMap: Record<string, any> = {
  AppFrame,
  PlayerFrame,
  PlayersContainer,
}

const rootProps = defineProps<{
  components: any,
  rootComponent: string,
  props: Record<string, any>
}>()

const vars: Record<string, any> = {}

Object.keys(rootProps.components[rootProps.rootComponent].variables).forEach(key => {
  const value = rootProps.components[rootProps.rootComponent].variables[key]
  if (typeof value === 'object' && value !== null) {
    // we need to deep clone the object / array or else same object / array will be shared across all instances
    vars[key] = ref(JSON.parse(JSON.stringify(value)))
  } else {
    vars[key] = ref(value)
  }
})

vars.timer = useTimer({
  countDown: true
})

const defineExposeObject = ref({})
const methods = ref<any>({})

function defineExposeHelper(obj: Record<string, any>) {
  defineExposeObject.value = obj
}

function defineMethods(obj: Record<string, any>) {
  methods.value = obj
}

function setRef(ref: string, el: any) {
  if (!vars[ref]) {
    vars[ref] = {
      value: el
    }
  } else {
    if (Array.isArray(vars[ref].value)) {
      vars[ref].value.push(el)
    } else {
      // for some reason, we get the same element twice sometimes
      if (vars[ref].value === el) {
        return
      }
      vars[ref].value = [vars[ref].value, el]
    }
  }
}

if (rootProps.components[rootProps.rootComponent].computed) {
  Object.keys(rootProps.components[rootProps.rootComponent].computed).forEach(key => {
    vars[key] = computed(() => {
      const constants = rootProps.components[rootProps.rootComponent].Constants || {}
      return new Function('vars', 'props', 'Constants',
        `${rootProps.components[rootProps.rootComponent].computed[key]}`
      )(vars, rootProps.props, constants)
    })
  })
}

const rootPropsPropsDeValued = Object.keys(rootProps.props).reduce((acc: any, key) => {
  acc[key] = rootProps.props[key].value
  return acc
}, {})

try {
  new Function('vars', 'props', 'Constants', 'defineMethods', 'defineExpose',
    `with(vars){ ${rootProps.components[rootProps.rootComponent].script} }`
  )(vars, rootPropsPropsDeValued, rootProps.components[rootProps.rootComponent].Constants || {}, defineMethods, defineExposeHelper)
} catch (error) {
  console.error('Error executing script:', error)
}

defineExpose(defineExposeObject.value)

const selfComp = getCurrentInstance()?.type as any

const Renderer = defineComponent({
  name: 'Renderer',
  props: {
    node: { type: Object, required: true }
  },
  setup(props) {
    const shouldRender = computed(() => {
      if(props.node.vIf) {
        const plainVars: Record<string, any> = {}
        Object.keys(vars).forEach(key => {
          plainVars[key] = vars[key].value
        })
        const condition = new Function('vars', `with(vars){ return ${props.node.vIf}; }`)
        return condition(plainVars)
      }
      return true
    })

    return () => {
      if (!shouldRender.value) return null
      const { element, children, slots, text, vModel, vIf, vFor, on, ref, ...attrs } = props.node

      if (vFor) {
        const [alias, source] = vFor.split(' in ')
        let items = new Function('vars', `with(vars){ return ${source}.value; }`)(vars)

        if (typeof items === 'number') {
          items = Array.from({ length: items }, (_, i) => i + 1)
        }

        return items.map((itemValue: any, idx: number) => {
          const newNode = { ...props.node, vFor: undefined, scoped: { ...props.node.scoped, [alias]: itemValue } }
          return h(Renderer, { node: newNode, key: idx })
        })
      }

      const subcomponent = rootProps.components[element]
      if (subcomponent) {
        const subProps: Record<string, any> = {}
        if (props.node.props) {
          Object.keys(props.node.props).forEach(key => {
            const val = props.node.props[key]
            if (typeof val === 'string') {
              try {
                const varsExtended = { ...vars, ...props.node.scoped }
                subProps[key] = new Function('vars', `with(vars){ return ${val}; }`)(varsExtended)
              } catch {
                subProps[key] = `!![Could not resolve: ${val}]!!`
              }
            } else {
              subProps[key] = val
            }
          })
        }

        const componentProps: any = {
          components: rootProps.components,
          rootComponent: element,
          props: subProps,
        }

        if (ref) {
          componentProps.ref = (el: any) => {
            setRef(ref, el)
          }
        }

        return h(selfComp, componentProps)
      }

      const content: VNode<RendererNode, RendererElement, { [key: string]: any }>[] = []
      if(text) {
        const interpolatedText = text.replace(/{{\s*(.*?)\s*}}/g, (_: any, expression: string) => {
          try {
            const replaceValue = new Function('vars', `with(vars){ return ${expression}; }`)(vars) ?? ''
            // console.log({ expression, replaceValue })
            return replaceValue
          } catch {
            return ''
          }
        })
        content.push(h('span', interpolatedText))
      }
      if(children) {
        content.push(...children.map((child: any, index: number) =>
          h(Renderer, { node: child, key: index })
        ))
      }

      const slotFns: Record<string, Function> = {}
      if(slots) {
        Object.keys(slots).forEach(slotName => {
          slotFns[slotName] = () => slots[slotName].map((child: any, index: number) =>
            h(Renderer, { node: child, key: `${slotName}-${index}` })
          )
        })
      }
      if(content.length && !slotFns.default) {
        slotFns.default = () => content
      }

      const comp = componentsMap[element] || resolveDynamicComponent(element || 'div')

      let extraProps: Record<string, any> = {}

      if (props.node.props) {
        Object.keys(props.node.props).forEach(key => {
          const val = props.node.props[key]
          if (typeof val === 'string') {
            const value = new Function('vars', `with(vars){ return ${val}; }`)(vars)
            extraProps[key] = value
          } else {
            extraProps[key] = val
          }
        })
      }

      if (vModel && (element === 'input' || element === 'textarea')) {
        extraProps = {
          value: vars[vModel].value,
          onInput: (e: any) => {
            vars[vModel].value = attrs.type === 'number'
              ? Number(e.target.value)
              : e.target.value
          }
        }
      }

      if (vModel && element === 'select') {
        extraProps = {
          value: vars[vModel].value,
          onChange: (e: any) => {
            vars[vModel].value = Number(e.target.value) || e.target.value
          }
        }
      }

      // Handle event handlers in the 'on' property
      const eventHandlers: Record<string, any> = {}
      if (on) {
        Object.keys(on).forEach(eventKey => {
          const handlerCode = on[eventKey]

          // Parse event name and modifiers (e.g., "click.stop.prevent")
          const [eventName, ...modifiers] = eventKey.split('.')
          const hasStop = modifiers.includes('stop')
          const hasPrevent = modifiers.includes('prevent')

          const camelCaseEventName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`
          eventHandlers[camelCaseEventName] = (...args: any[]) => {
            const event = args[0]

            // Apply modifiers
            if (hasStop && event) {
              event.stopPropagation()
            }
            if (hasPrevent && event) {
              event.preventDefault()
            }

            try {
              // Create an object that combines unwrapped refs from vars with methods
              const context: any = {};

              // Add all methods directly
              Object.keys(methods.value).forEach(key => {
                context[key] = methods.value[key];
              });

              // Add all variables, unwrapping refs where needed
              Object.keys(vars).forEach(key => {
                Object.defineProperty(context, key, {
                  get: () => vars[key].value,
                  set: (value) => { vars[key].value = value }
                });
              });

              // Execute the handler with the properly prepared context
              return new Function('context', 'event', 'args', `with(context){ ${handlerCode}${!handlerCode.endsWith('()') ? '()' : ''} }`)(context, args[0], args)
            } catch (error) {
              console.error(`Error executing event handler for ${eventName}:`, error)
            }
          }
        })
      }

      if (element === 'template') {
        return content
      }

      const finalProps: any = {
        ...attrs,
        ...extraProps,
        ...eventHandlers,
        style: props.node.style || {}
      }

      if (ref) {
        finalProps.ref = (el: any) => {
          setRef(ref, el)
        }
      }

      return h(comp, finalProps, slotFns)
    }
  }
})
</script>
