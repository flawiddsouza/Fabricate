<template>
  <template v-for="(node, index) in components[rootComponent].nodes" :key="index">
    <Renderer :node="node" />
  </template>
</template>

<script setup lang="ts">
import { ref, defineComponent, h, resolveDynamicComponent, computed, getCurrentInstance, type RendererElement, type RendererNode, type VNode } from 'vue'
import AppFrame from './AppFrame.vue'
import PlayerFrame from './PlayerFrame.vue'

const rootProps = defineProps<{
  components: any,
  rootComponent: string,
  props: Record<string, any>
}>()

const vars: Record<string, any> = {}
Object.keys(rootProps.components[rootProps.rootComponent].variables).forEach(key => {
  vars[key] = ref(rootProps.components[rootProps.rootComponent].variables[key])
})

if (rootProps.components[rootProps.rootComponent].computed) {
  Object.keys(rootProps.components[rootProps.rootComponent].computed).forEach(key => {
    vars[key] = computed(() => {
      const constants = rootProps.components[rootProps.rootComponent].Constants || {}
      return new Function('vars', 'props', 'Constants',
        `with(vars, props, Constants){ ${rootProps.components[rootProps.rootComponent].computed[key]} }`
      )(vars, rootProps.props, constants)
    })
  })
}

console.log(vars)

const selfComp = getCurrentInstance()?.type

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
      const { element, children, slots, text, vModel, vIf, ...attrs } = props.node

      const subcomponent = rootProps.components[element]
      if (subcomponent) {
        const subProps: Record<string, any> = {}
        if (props.node.props) {
          Object.keys(props.node.props).forEach(key => {
            const val = props.node.props[key]
            subProps[key] = typeof val === 'string' && vars[val] ? vars[val].value : val
          })
        }
        return h(selfComp, {
          components: rootProps.components,
          rootComponent: element,
          props: subProps
        })
      }

      const content: VNode<RendererNode, RendererElement, { [key: string]: any }>[] = []
      if(text) {
        content.push(h('span', text))
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

      const componentsMap: Record<string, any> = {
        AppFrame,
        PlayerFrame,
      }
      const comp = componentsMap[element] || resolveDynamicComponent(element || 'div')

      let extraProps = {}

      if (props.node.props) {
        Object.keys(props.node.props).forEach(key => {
          const val = props.node.props[key]
          if (typeof val === 'string') {
            console.log(vars.playerLoginDetails.value)
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
          onInput: (e) => {
            vars[vModel].value = attrs.type === 'number'
              ? Number(e.target.value)
              : e.target.value
          }
        }
      }

      if (vModel && element === 'select') {
        extraProps = {
          value: vars[vModel].value,
          onChange: (e) => {
            vars[vModel].value = Number(e.target.value) || e.target.value
          }
        }
      }

      if (element === 'template') {
        return content
      }

      return h(comp, { ...attrs, ...extraProps, style: props.node.style || {} }, slotFns)
    }
  }
})
</script>
