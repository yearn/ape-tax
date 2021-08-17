<template lang="pug">
#notFound
  div(class="notFound")
    p 😵
    p Page Not Found
    p 404
</template>

<script>
export default {name: 'NotFound'};
</script>

<style>
  div.notFound {
    width: 400px;
    height: 200px;
    margin: auto;
    text-align: center;
    font-size: 3em;
  }
  .notFound .smallish {
      font-size: 0.5em;
  }
</style>