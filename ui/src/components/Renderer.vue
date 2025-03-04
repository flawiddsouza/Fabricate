<template>
  <FabricateComponent :components="{ Root: GameTesterRoot, Player: GameTesterPlayer }" root-component="Root" :props="{}" />
</template>

<script setup lang="ts">
import FabricateComponent from './FabricateComponent.vue'
import GameTesterRoot from '../samples/GameTester/Root.json'
// import GameTesterRoot from '../samples/SelectOptionsVFor/Root.json'
import GameTesterPlayer from '../samples/GameTester/Player.json'
</script>
