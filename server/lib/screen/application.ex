defmodule Screen.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ScreenWeb.Telemetry,
      Screen.Repo,
      {DNSCluster, query: Application.get_env(:screen, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Screen.PubSub},
      {Registry, keys: :unique, name: Screen.Documents.DocRegistry},
      {DynamicSupervisor, name: Screen.Documents.DocSupervisor, strategy: :one_for_one},
      # Start to serve requests, typically the last entry
      ScreenWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Screen.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ScreenWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
