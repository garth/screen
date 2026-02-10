defmodule ScreenWeb.Router do
  use ScreenWeb, :router

  import ScreenWeb.UserAuth

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ScreenWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :fetch_current_scope_for_user
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", ScreenWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  # Other scopes may use custom stacks.
  # scope "/api", ScreenWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:screen, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: ScreenWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end

    scope "/api/test", ScreenWeb do
      pipe_through :api

      post "/create-user", TestController, :create_user
      post "/create-unverified-user", TestController, :create_unverified_user
      post "/create-password-reset", TestController, :create_password_reset
      post "/create-document", TestController, :create_document
      post "/update-document", TestController, :update_document
      get "/document-meta/:id", TestController, :document_meta
      post "/create-document-user", TestController, :create_document_user
    end
  end

  ## Authentication routes

  scope "/", ScreenWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{ScreenWeb.UserAuth, :require_authenticated}] do
      live "/users/settings", UserLive.Settings, :edit
      live "/users/settings/confirm-email/:token", UserLive.Settings, :confirm_email
    end

    post "/users/update-password", UserSessionController, :update_password
  end

  scope "/", ScreenWeb do
    pipe_through [:browser]

    live_session :current_user,
      on_mount: [{ScreenWeb.UserAuth, :mount_current_scope}] do
      live "/users/register", UserLive.Registration, :new
      live "/users/log-in", UserLive.Login, :new
      live "/users/log-in/:token", UserLive.Confirmation, :new
    end

    post "/users/log-in", UserSessionController, :create
    delete "/users/log-out", UserSessionController, :delete
  end

  scope "/health", ScreenWeb do
    pipe_through :api

    get "/", HealthController, :check
  end

  # SPA catch-all: serve index.html for any unmatched path
  # This must be the LAST route so it doesn't override auth or API routes
  scope "/", ScreenWeb do
    pipe_through [:browser]

    get "/*path", PageController, :spa
  end
end
