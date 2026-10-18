#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

static volatile sig_atomic_t child_pid;

static void forward_signal(int signal_number) {
  if (child_pid > 0) kill(child_pid, signal_number);
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--version") == 0) {
    puts("tern 0.9.4 (lifecycle fixture)");
    return 0;
  }
  signal(SIGTERM, forward_signal);
  signal(SIGINT, forward_signal);
  pid_t child = fork();
  if (child < 0) { perror("fork"); return 1; }
  if (child == 0) {
    char *args[argc + 2];
    args[0] = "bun";
    args[1] = FIXTURE_JS;
    for (int i = 1; i < argc; i++) args[i + 1] = argv[i];
    args[argc + 1] = NULL;
    execvp(args[0], args);
    perror("execvp");
    _exit(1);
  }
  child_pid = child;
  int status;
  while (waitpid(child, &status, 0) < 0) {
    if (errno != EINTR) { perror("waitpid"); return 1; }
  }
  return WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
}
