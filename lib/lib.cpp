#include <thread>
#include <cstdio>
#include <vector>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <emscripten/threading.h>
#include <future>

struct Stuff {
  std::string s1;
  int s2;
  int s3;
};

void takes_val(emscripten::val some_string) {
  printf("val string: %s\n", some_string.as<std::string>().c_str());
}

void takes_val_ref(const emscripten::val& some_string) {
  printf("val string: %s\n", some_string.as<std::string>().c_str());
}

void takes_val_move(const emscripten::val&& some_string) {
  printf("val string: %s\n", some_string.as<std::string>().c_str());
}

void takes_class_const_ref(const Stuff& stuff) {
  printf("log stuff: %s\n", stuff.s1.c_str());
}

void fn_takes_string(std::string message) {
  printf("log string: %s\n", message.c_str());
}

void fn_takes_const_string_ref(const std::string& message) {
  printf("log string: %s\n", message.c_str());
}

std::string get_stored_string(const emscripten::val& storage, const std::string& key) {
  auto result = storage.call<emscripten::val>("getItem", key);
  if (result == emscripten::val::null()) {
    return {};
  }

  return result.as<std::string>();
}

struct SharedContext {
  std::string key;
  std::promise<std::string> promise;
};

std::string get_item_from_session_storage(const std::string& key) {
  auto session_storage = emscripten::val::global("sessionStorage");
  if (session_storage != emscripten::val::undefined()) {
    return get_stored_string(session_storage, key);
  }

  std::promise<std::string> promise;
  std::future<std::string> future = promise.get_future();

  auto ctx = std::make_unique<SharedContext>(std::move(key), std::move(promise));
  emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_VI, static_cast<void(*)(std::unique_ptr<SharedContext>)>([] (auto raw_ctx) {
    auto session_storage = emscripten::val::global("sessionStorage");
    raw_ctx->promise.set_value(get_stored_string(session_storage, raw_ctx->key));
  }), ctx.release());

  return future.get();
}

void get_from_main_thread() {
  auto val = get_item_from_session_storage("name");
  printf("from main thread: %s\n", val.c_str());
}

void get_from_thread() {
  std::thread([] {
    auto val = get_item_from_session_storage("name");
    printf("from other thread: %s\n", val.c_str());
  }).detach();
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::value_object<Stuff>("Stuff")
    .field("s1", &Stuff::s1)
    .field("s2", &Stuff::s2)
    .field("s3", &Stuff::s3);

  emscripten::function("get_from_main_thread", &get_from_main_thread);
  emscripten::function("get_from_thread", &get_from_thread);
  emscripten::function("fn_takes_string", &fn_takes_string);
  emscripten::function("fn_takes_const_string_ref", &fn_takes_const_string_ref);
  emscripten::function("takes_class_const_ref", &takes_class_const_ref);
  emscripten::function("takes_val", &takes_val);
  emscripten::function("takes_val_ref", &takes_val_ref);
  emscripten::function("takes_val_move", &takes_val_move);
}
