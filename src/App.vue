<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
//@ts-ignore
import VueWordCloud from 'vuewordcloud';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import { inferenceModel } from './utils/predict';
import { min } from 'lodash';

const image = ref<string>("./demo_fruits.jpg")
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const res = ref<[[string, number]]>([["", 0]])
const imageRatio = ref<number>(0)
const imageHeight = ref<number>(0)
const cropperMaxWidth = ref<number>(1)

function storeImageProps(callback: () => void) {
  let img = new Image();
  img.onload = function() {
      imageRatio.value = img.width / img.height
      imageHeight.value = img.height
      callback()
  };
  img.src = image.value;
}

function refreshCropper() {
  cropperMaxWidth.value = min([(min([imageHeight.value, window.innerHeight * 0.5]) as number) * imageRatio.value, window.innerWidth * 0.9]) as number
  if (cropperRef.value) {
    cropperRef.value.refresh()
  }
}

function uploadImage(event: Event) {
  const target = event.target as HTMLInputElement;

  if (!target || !target.files) {
    return;
  }

  if (target.files && target.files[0]) {
    if (image.value) {
      URL.revokeObjectURL(image.value);
    }

    const blob = URL.createObjectURL(target.files[0]);
    image.value = blob

    storeImageProps(refreshCropper)
  }
}

async function confirmCrop() {
  if (cropperRef.value) {
    const result = cropperRef.value.getResult();
    //console.time('Inference time');
    const [p, _] = await inferenceModel(result.canvas!.toDataURL())
    //console.timeEnd('Inference time');

    let tempRes: [[string, number]] = [[capWords(p[0].name), 1]]
    for (let i = 1; i < p.length; i++) {
      if (p[i].probability / p[0].probability < 0.1)
        break
      tempRes[i] = [capWords(p[i].name), Math.sqrt(p[i].probability / p[0].probability)]
    }
    res.value = tempRes
    //console.log(tempRes)
    //console.log(t)
  }
}

function capWords(str: string): string {
  return str.split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

onMounted(() => {
  storeImageProps(refreshCropper)
  if (cropperRef.value) {
    //preview coordinates
    const multiplier = 0.84
    cropperRef.value.setCoordinates(({ imageSize }) => ({
      left: imageSize.width/2 - imageSize.height * multiplier / 2,
      top: imageSize.height/2 - imageSize.height * multiplier / 2,
      width: imageSize.height * multiplier,
      height: imageSize.height * multiplier
    }))
  }

  window.addEventListener("resize", refreshCropper);
  if (screen.orientation) {
    screen.orientation.addEventListener("change", refreshCropper)
  }
  window.addEventListener("orientationchange", refreshCropper);

  new ResizeObserver(refreshCropper).observe(document.body)
})

onUnmounted(() => {
  if (image.value) {
    URL.revokeObjectURL(image.value);
  }

  window.removeEventListener("resize", refreshCropper);
  if (screen.orientation) {
    screen.orientation.removeEventListener("change", refreshCropper)
  }
  window.removeEventListener("orientationchange", refreshCropper);
})

</script>

<template>
  <h1>Fruit Identifier</h1>
  <div class="cropperContainer" :style = "{maxWidth: cropperMaxWidth + 'px'}">
    <cropper
      @change="confirmCrop"
      ref="cropperRef"
      class="cropper"
      :src=image
      :stencil-props="{ aspectRatio: 1/1 }"
      :resize-image="false"
      :debounce="500"
    />
  </div>
  <label for="file-upload" class="uploadButton">
    Select Image
  </label>
  <input id="file-upload" type="file" accept="image/*" @change="uploadImage">
  <vue-word-cloud
    class="cloud"
    :words=res
    :color="([, weight]: [string, number]) => `rgb(${weight * weight * 255}, ${weight * weight * 155 + 70}, ${weight * weight * 30 + 70})`"
    font-family="Roboto"
    :spacing=0.15
  />
  <p class="footer">Created with <a target="_blank" href="https://www.kaggle.com/datasets/aelchimminut/fruits262">Fruits-262</a>, <a target="_blank" href="https://advanced-cropper.github.io/vue-advanced-cropper/">Vue Advanced Cropper</a>, and <a target="_blank" href="https://github.com/SeregPie/VueWordCloud">Vue Word Cloud</a></p>

</template>

<style scoped>
h1 {
  margin-top: 3svh;
  color: rgb(255, calc(155 + 70), calc(30 + 70));
  font-size: 4svh;
}

.cropper {
  margin: 0 auto
}
.cropperContainer {
  max-height: 50svh;
  display: flex;
  justify-content: center; 
  margin: 0 auto;
}

.uploadButton {
  max-height: 3svh;

  background-color: rgb(223, 224, 162);
  border-radius: 8px;
  border-width: 0;
  color: #242424;
  cursor: pointer;
  display: inline-block;
  font-family: "Haas Grot Text R Web", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 500;
  line-height: 50%;
  list-style: none;
  margin: 0;
  padding: 2svh 2.4svh;
  text-align: center;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  margin: 2svh 0 1svh;
}

input {
  display: none;
}

.cloud {
  min-height: 25svh;
  max-height: 25svh;
  min-width: 90svw;
  max-width: 90svw;
}

.footer {
  position: absolute;
  bottom: 0px;
  left: 10svw;
  right: 10svw;
  max-width: 80svw;
  text-align: center;
  justify-content: center; 
  margin: auto;
  font-size: 2svh;
}
</style>